# %% [code] {"scrolled":true,"jupyter":{"outputs_hidden":false}}
from google.cloud import bigquery
import plotly.express as px
import plotly.graph_objs as go
import json
import plotly # plotly >=4.12.0
import pyarrow
import re

bq_client = bigquery.Client(project = "yyyaaannn")
GCF_MODE = True
total_bytes = 0

# %% [markdown]
# # All plots are interactive (optimized for full-screen)
# 
# The results displayed are only for illustrating and does not reflect the latest result.
# 
# All functions require non-missing parameters; however, missing values are permissible with `main()`

# %% [code] {"jupyter":{"outputs_hidden":false}}
base_url = "https://europe-west1-yyyaaannn.cloudfunctions.net/qr-trend"

# CSS for styling all tables
html_style = """
<link href="https://fonts.googleapis.com/css?family=Raleway" rel="stylesheet">
<style>
* {font-family: Raleway;}
iframe {width:90%; height:1999px; border:none;}
p {font-size:smaller; color: #999;}
table {border-collapse: collapse; width: 99%; font-size: smaller; color: #999;}
td, th {border: 1px solid #ddd; padding: 8px;}
tr:nth-child(even){background-color: #f2f2f2;}
tr:hover {background-color: #ddd;}
</style>
"""

# The Plotly button will be shared in all plots
btn_legend = [{'type': 'buttons',
               'buttons': [{'label': '≡ Toggle Legend',
                            'method': 'relayout', 
                            'args': ['showlegend', False], 
                            'args2': ['showlegend', True]}],
               'x': 0, 'y': 1.1 }]

# %% [markdown]
# # Utility Functions

# %% [code] {"jupyter":{"outputs_hidden":false}}
def rows_all_tbl():
    QUERY = """
        SELECT _TABLE_SUFFIX as TBL, count(*) as N
        FROM `Explore.*`
        WHERE _TABLE_SUFFIX != "LUMO01" and tss = current_date()
        group by _TABLE_SUFFIX
    """
    # WHERE _TABLE_SUFFIX in (SELECT table_id FROM `Explore.__TABLES_SUMMARY__` where table_id like "%01")
    df = bq_client.query(QUERY).result().to_dataframe()
    return df.to_string(index=False, header=False).replace('\n', ' || ')

if not GCF_MODE: print(rows_all_tbl())

# %% [code] {"jupyter":{"outputs_hidden":false}}
def health_check(n_days):
    global total_bytes
    QUERY = """
        SELECT _TABLE_SUFFIX as TBL, tss, count(*) as N
        FROM `Explore.*`
        WHERE _TABLE_SUFFIX != "LUMO01" and tss between DATE_SUB(current_date(), INTERVAL {} DAY) and current_date()
        group by _TABLE_SUFFIX, tss
        order by TBL, tss
    """.format(n_days)
    # WHERE _TABLE_SUFFIX in (SELECT table_id FROM `Explore.__TABLES_SUMMARY__` where table_id like "%01")

    total_bytes += bq_client.query(QUERY, job_config=bigquery.QueryJobConfig(dry_run = True)).total_bytes_processed
    df = bq_client.query(QUERY).result().to_dataframe()
    fig = px.line(df, x='tss', y='N', color='TBL', height=800, template='plotly_white')
    
    return json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder) if GCF_MODE else fig

if not GCF_MODE: health_check(14).show()

# %% [markdown]
# # Hotels

# %% [code] {"jupyter":{"outputs_hidden":false}}
def tbl_hotel(q_checkin, q_hotel, q_room, q_rate):
    global total_bytes
    QUERY = """
        SELECT  FORMAT_DATE("%Y-%m-%d", check_in) as check_in, concat(hotel, ': ', nights, ' nights') as hotel_nt, ceiling(min(daily_rate)) as best_rate
        FROM yyyaaannn.ExploreV.Hotels_latest
        where REGEXP_CONTAINS(hotel, r'(?i){}') and REGEXP_CONTAINS(room_type, r'(?i){}') and REGEXP_CONTAINS(rate_type, r'(?i){}')
          and check_in between DATE_SUB(DATE '{}', INTERVAL 7 DAY) and DATE_ADD(DATE '{}', INTERVAL 7 DAY)
        group by check_in, hotel, nights
        order by check_in, hotel
    """.format(q_hotel, q_room, q_rate, q_checkin, q_checkin)

    total_bytes += bq_client.query(QUERY, job_config=bigquery.QueryJobConfig(dry_run = True)).total_bytes_processed
    dt = bq_client.query(QUERY).result().to_dataframe()

    # Data to HTML
    outd = "<p>pricing calendar unavailable</p>"
    if dt.shape[0]:
        dt['href'] = base_url + '?q_checkin=' + dt['check_in'] + "&q_hotel=" + q_hotel
        dt_col_name = 'Check-in<br>Click for trend'
        dt[dt_col_name] = '<a href="'+ dt['href'] + '">' + dt['check_in'] + '</a>'

        dfmin = dt.loc[:, ['hotel_nt', 'best_rate']].groupby('hotel_nt').min().reset_index()
        dfmin['star'] = ' ♥'
        dt2 = dt.merge(dfmin, how = "left", on = ['hotel_nt', 'best_rate'])
        dt2.fillna("", inplace=True)
        dt2['value'] = round(dt['best_rate']).astype(str).replace(".0", "") + dt2['star']

        outd = (dt2.pivot(index='hotel_nt', columns=dt_col_name,  values='value')
                  .to_html(na_rep="", sparsify=False, escape=False))
    
    return outd

if not GCF_MODE: display(HTML(tbl_hotel("2021-11-27", "regis", "deluxe|premier", "dining")))

# %% [code] {"jupyter":{"outputs_hidden":false}}
def plot_hotel(q_checkin, q_hotel, q_room, q_rate):
    global total_bytes
    QUERY =  """
        SELECT hotel, concat('(', nights, 'nts)', room_type) as nt_room, ceiling(min(eur_avg)) as best_rate, cast(tss as DATE) as tss
        FROM (       select hotel, nights, room_type, rate_type, check_in, tss, eur_avg from yyyaaannn.Explore.MRT01
          union all (select hotel, nights, room_type, rate_type, check_in, tss, eur_avg from yyyaaannn.Explore.ACR01)  
          union all (select hotel, nights, room_type, rate_type, check_in, tss, 1.20 * eur_avg from yyyaaannn.Explore.HLT01)  
          union all (select hotel, nights, room_type, rate_type, check_in, tss, 1.27 * eur_avg from yyyaaannn.Explore.FSH01)  
        )
        where REGEXP_CONTAINS(hotel, r'(?i){}') and REGEXP_CONTAINS(room_type, r'(?i){}')
          and REGEXP_CONTAINS(rate_type, r'(?i){}') and check_in = DATE('{}')
        group by hotel, nights, room_type, tss
        order by hotel
    """.format(q_hotel, q_room, q_rate, q_checkin)
    
    total_bytes += bq_client.query(QUERY, job_config=bigquery.QueryJobConfig(dry_run = True)).total_bytes_processed
    df = bq_client.query(QUERY).result().to_dataframe()

    # Plotly
    if df.shape[0]:
        fig = px.bar(df, x='tss', y='best_rate', color='nt_room', text='nt_room',
                  barmode='group',  facet_row='hotel', height=800, template='plotly_white')

        # Plotly > add trace for lowest rate, global lowest refline
        df_tl  = df.groupby(['hotel', 'tss'], as_index = False).min()
        df_gl = df[['hotel', 'best_rate']].groupby('hotel', as_index = False).min()
        all_hotels = df_tl.hotel.unique()

        for i in range(len(all_hotels)):
            the_hotel = all_hotels[i]
            the_df_tl = df_tl[df_tl['hotel'] == the_hotel].copy()
            the_df_tl['g_lowest'] = df_gl[df_gl['hotel'] == the_hotel].best_rate.values[0]
            fig.add_trace(go.Scatter(
                x=the_df_tl.tss, y=the_df_tl.best_rate, name=' (best rate on the day)'), 
                len(all_hotels) - i, 1)
            fig.add_trace(go.Scatter(
                x=the_df_tl.tss, y=the_df_tl.g_lowest, name=' [lowest observed ever]', 
                mode='lines', line_color='black', line=dict(width=0.5)), 
            len(all_hotels) - i, 1)


        # Plotly > less cluster; show comparison on hover by default
        fig.for_each_annotation(lambda a: a.update(text=a.text.replace("hotel=", "")))
        fig.for_each_trace(lambda t: t.update(name=t.name.replace("nt_room=", "")))
        fig.update_layout(hovermode='x', showlegend=False, updatemenus=btn_legend)
        fig.update_traces(hovertemplate = "%{y}")
    else:
        fig=px.scatter(x=[0], y=[0], height=200, title="No results matching the query")
        fig.update_yaxes(visible=False, showticklabels=False)
        fig.update_xaxes(visible=False, showticklabels=False)


    return json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder) if GCF_MODE else fig

if not GCF_MODE: plot_hotel("2021-11-27", "regis", "deluxe|premier", "dining").show()

# %% [markdown]
# # Fligths

# %% [code] {"jupyter":{"outputs_hidden":false}}
def tbl_flight(q_route, q_ddate, q_rdate):
    global total_bytes
    q_route_copy = q_route
    q_route = re.sub(r"[^a-zA-Z]",".*", q_route)

    QUERY = """
    select distinct
        route, eur, ts,
        FORMAT_DATE("%Y-%m-%d", ddate) as ddate, 
        FORMAT_DATE("%Y-%m-%d", rdate) as rdate
    from 
        ExploreV.Fly_now
    where 
        REGEXP_CONTAINS(route, r'(?i){}')
        and DATE_DIFF(ddate, DATE '{}', DAY) between -5 and 5
        and DATE_DIFF(rdate, DATE '{}', DAY) between -5 and 5        
    """.format(q_route, q_ddate, q_rdate)

    total_bytes += bq_client.query(QUERY, job_config=bigquery.QueryJobConfig(dry_run = True)).total_bytes_processed
    dt = bq_client.query(QUERY).result().to_dataframe()

    # Data to HTML
    outd = "<p>pricing calendar unavailable</p>"
    outp = " "
    if dt.shape[0]:
        dt['href'] = base_url + '?q_ddate=' + dt['ddate'] + '&q_rdate=' + dt['rdate'] + "&q_route=" + q_route_copy
        dt['value'] = '<a href="'+ dt['href'] + '">' + dt['eur'].astype(int).astype(str) + '</a>'
        id_mins = dt[dt['eur'] == dt['eur'].min()].index
        dt.loc[id_mins, 'value'] = dt['value'][id_mins] + ' ♥'
        dt_col_name = 'click on price for trend'
        dt[dt_col_name] = dt['rdate']
        
        outd = (dt.pivot(index='ddate', columns=dt_col_name,  values='value')
                  .to_html(na_rep="", sparsify=False, float_format="%d", escape=False))
        outp = " ".join(dt.route.unique() + " on " + str(dt.ts.min()))
        
    return f"{outd}<p>{outp}</p>"

if not GCF_MODE: display(HTML(tbl_flight("OSL Sydney|can hel", "2021-06-11", "2021-06-30")))

# %% [code] {"jupyter":{"outputs_hidden":false}}
def plot_flight(q_route, q_ddate, q_rdate):
    global total_bytes
    xdests4 = re.sub(r"[^a-zA-Z]"," ", q_route).split(" ")
    q_route = re.sub(r"[^a-zA-Z]",".*", q_route)
    q_dests = f"{xdests4[1]}.*{xdests4[2]}"

    QUERY =  """
    with 
    AY as (
        select distinct 
            a.route, a.ddate, b.ddate as rdate, ceil(a.eur+b.eur) as eur, cast(a.tss as DATE) as tss
        from 
            Explore.AY01 a 
        inner join 
            Explore.AY01 b
        on 
            a.route=b.route and a.inout!=b.inout and a.tss=b.tss
        where 
            REGEXP_CONTAINS(a.route, r'(?i){}') and REGEXP_CONTAINS(b.route, r'(?i){}')
            and a.ddate = DATE('{}') and b.ddate = DATE('{}')
    ),
    QR_old as (
        select distinct 
            a.route, a.ddate, b.ddate as rdate, ceil(a.eur+b.eur) as eur, cast(a.tss as DATE) as tss
        from 
            Explore.QR01 a 
        inner join 
            Explore.QR01 b
        on 
            a.route=b.route and a.inout!=b.inout and a.tss=b.tss
        where 
            REGEXP_CONTAINS(a.route, r'(?i){}') and REGEXP_CONTAINS(b.route, r'(?i){}')
            and a.ddate = DATE('{}') and b.ddate = DATE('{}')
    ),
    QR_new as (
        select 
            route, ddate, rdate, ceil(eur) as eur, cast(tss as date) as tss
        from
            Explore.QR03
        where 
            REGEXP_CONTAINS(route, r'(?i){}')
            and ((ddate = DATE('{}') and rdate = DATE('{}')) or (ddate = DATE('{}') and rdate = DATE('{}')))
    ),
    all_flts as (
        select * from AY union all (select * from QR_old) union all (select * from QR_new)
    )

    select 
        case when REGEXP_CONTAINS(route, r'(?i){}') then "Selected Route" else "Alternatives" end as ftype,
        route, ddate, rdate, min(eur) as eur, tss 
    from 
        all_flts group by route, ddate, rdate, tss
    order by 
        ftype desc, tss desc
    """.format(q_dests, q_dests, q_ddate, q_rdate, q_dests, q_dests, q_ddate, q_rdate, q_dests, q_ddate, q_rdate, q_rdate, q_ddate, q_route)
    
    total_bytes += bq_client.query(QUERY, job_config=bigquery.QueryJobConfig(dry_run = True)).total_bytes_processed
    df = bq_client.query(QUERY).result().to_dataframe()

    if df.shape[0]:
        min_global = df[df.ftype == "Selected Route"].eur.min()
        min_latest = df[df.ftype == "Selected Route"].eur.values[0] if min_global==min_global else min_global
        txt_xlab = f"Lowest {min_global}EUR / Today {min_latest}EUR" if min_global==min_global else "No exact match found. Showing alternative flights only"

        fig = px.bar(df, x='tss', y='eur', color='route', text='route', barmode='group',
                     facet_row='ftype', height=750, template='plotly_white',
                     labels=dict(tss=txt_xlab))
        fig.add_hline(y=min_global, line_width=1, line_color="lightgrey", line_dash="dot")
        fig.add_hline(y=min_latest, line_width=1, line_color="lightgrey")
        fig.update_traces(hovertemplate = "%{y}")
        fig.update_layout(hovermode='x', showlegend=False, updatemenus=btn_legend)
        fig.for_each_annotation(lambda a: a.update(text=a.text.replace("ftype=", "")))
    else:
        fig=px.scatter(x=[0], y=[0], height=200, title="No results matching the query")
        fig.update_yaxes(visible=False, showticklabels=False)
        fig.update_xaxes(visible=False, showticklabels=False)
        
    return json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder) if GCF_MODE else fig

if not GCF_MODE: plot_flight("OSL Sydney|can hel", "2021-06-11", "2021-06-30").show()


# %% [markdown]
# # Rental Apartments

# %% [code] {"jupyter":{"outputs_hidden":false}}
def plot_lumo(q_apt, q_area):
    global total_bytes

    QUERY =  """
        SELECT DISTINCT
            concat(room, " (", floor, "F) ", address) as apt, area, rent, 
            cast(tss as DATE) as tss
        FROM 
            Explore.LUMO01
        WHERE 
            REGEXP_CONTAINS(address, r'(?i){}') and REGEXP_CONTAINS(area, r'(?i){}') and rent is not null
    """.format(q_apt, q_area)

    total_bytes += bq_client.query(QUERY, job_config=bigquery.QueryJobConfig(dry_run = True)).total_bytes_processed
    df = bq_client.query(QUERY).result().to_dataframe()
    
    if df.shape[0]:
        fig = px.bar(df, x='tss', y='rent', facet_row='apt', color='apt',
                     height=800, template='plotly_white',
                     title="Lumo Apartment Availability, Shelflife and Pricing",
                     labels=dict(tss="Date Time", rent="Rent EUR", apt="Apartment"))

        fig.for_each_annotation(lambda a: a.update(text=" "))
        fig.update_layout(hovermode='x', showlegend=True, updatemenus=btn_legend, title_x=0.3)
        fig.update_yaxes(title='', visible=False, showticklabels=False)
    else:
        fig=px.scatter(x=[0], y=[0], height=200, title="No results matching the query")
        fig.update_yaxes(visible=False, showticklabels=False)
        fig.update_xaxes(visible=False, showticklabels=False)


    return json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder) if GCF_MODE else fig

if not GCF_MODE: plot_lumo("lehtisaarentie", ".*").show()

# %% [markdown]
# # Cloud function handler

# %% [code] {"jupyter":{"outputs_hidden":false}}
def main(request):
    global total_bytes
    total_bytes = 0
    
    # handle web-request or tester input
    rargs = request if type(request) is dict else request.args

    # assign arguments regardlessly
    q_ddate = rargs['q_ddate'] if 'q_ddate' in rargs else '2021-06-20'
    q_rdate = rargs['q_rdate'] if 'q_rdate' in rargs else '2021-07-09'
    q_route = rargs['q_route'] if 'q_route' in rargs else 'Helsinki Sydney|Sydney Helsinki'

    q_checkin = rargs['q_checkin'] if 'q_checkin' in rargs else '2021-06-20'
    q_hotel   = rargs['q_hotel']   if 'q_hotel'   in rargs else 'Bora|Moorea'
    q_room    = rargs['q_room']    if 'q_room'    in rargs else '.*'
    q_rate    = rargs['q_rate']    if 'q_rate'    in rargs else '.*'

    q_apt  = rargs['q_apt']  if 'q_apt'  in rargs else 'capellan'
    q_area = rargs['q_area'] if 'q_area' in rargs else '.*'

    # routing to correct function based on availablity
    if 'q_ddate' in rargs or 'q_rdate' in rargs or 'q_route' in rargs:
        if len(re.sub(r"[^a-zA-Z]"," ", q_route).split(" ")) == 4:
            tbl_html = tbl_flight(q_route, q_ddate, q_rdate)
            json_code = plot_flight(q_route, q_ddate, q_rdate)
        else:
            tbl_html = "<p>invalid flight route</p>"

    if 'q_checkin' in rargs or 'q_hotel' in rargs:
        tbl_html = tbl_hotel(q_checkin, q_hotel, q_room, q_rate)
        json_code = plot_hotel(q_checkin, q_hotel, q_room, q_rate)

    if 'q_apt' in rargs or 'q_area' in rargs:
        tbl_html = "<p>precise q_apt gives the best results</p>"
        json_code = plot_lumo(q_apt, q_area)

    if 'check_health' in rargs:
        tbl_html = "<p>showing recent number of rows by date</p>"
        json_code = health_check(rargs['check_health'])

    # build HTML output
    if 'json_code' in locals(): 
        return ("""
<!DOCTYPE html><meta charset="utf-8" />
<title>Plot Pricing Trend</title>
<script type="text/javascript">window.PlotlyConfig = {{MathJaxConfig: 'local'}};</script>
<script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
{}
<body><div class="chart" id="bargraph"><script>
        var graphs = {};
        Plotly.plot('bargraph',graphs,{{}});
</script></div>
<div>{}</div>
<div><p><br>>BigQuery Total Bytes Processed {} MiB</p></div>
</body>
""".format(html_style, json_code, tbl_html, int(total_bytes/1024/1024)))
    else:
        return("""
<!DOCTYPE html><meta charset="utf-8" />
<title>Initialize Plot Pricing Trend</title>{}
<body><p>{}<br><br></p><iframe src="https://yan.fi/resources/gcp_trend.html"></iframe></body> 
""".format(html_style, rows_all_tbl()))

# %% [code] {"jupyter":{"outputs_hidden":false}}
# return type is full HTML, not suitable to display inside a notebook
# main({q_checkin: '2021-12-12'})
if not GCF_MODE: print(f"BigQuery Total Bytes Processed {int(total_bytes/1024/1024)}MiB")