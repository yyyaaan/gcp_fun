from google.cloud import bigquery
import plotly.express as px
import plotly.graph_objs as go
import json
import plotly
import pyarrow

def get_bq_df(q_ddate, q_rdate, q_route):
  q_dests = q_route.replace("|", " ").split(" ")

  QUERY =  """
    select distinct route, ceiling(eur) as eur, cast(tss as DATE) as tss,
    concat(`from`, ' > ', `to`, ' on ',  FORMAT_DATE("%d%b", ddate)) as flight
    from `yyyaaannn.Explore.QR01`
    where (`from` = '{}' and `to` = '{}' and `ddate` = DATE('{}'))
      or (`from` = '{}' and `to` = '{}' and `ddate` = DATE('{}'))
    order by flight, tss
  """
  QUERY = QUERY.format(
      q_dests[0], q_dests[1], q_ddate, q_dests[2], q_dests[3], q_rdate)
  
  bq_client = bigquery.Client(project = "yyyaaannn")
  return bq_client.query(QUERY).result().to_dataframe()

def get_plot_json(df, q_route):
    fig = px.bar(df, x='tss', y='eur', color='route', text='route',
             barmode='group', facet_row='flight', 
             range_y=[0, 5000], height=900, template='plotly_white')

    fig.update_traces(hovertemplate = "%{y}: %{text}")

    # add selected route
    df_sel = df[df['route'] == q_route]
    if df_sel.flight.unique().shape == (2,):
        the_df = df_sel[df_sel['flight'] == df_sel.flight.unique()[0]]
        fig.add_trace(go.Scatter(
            x=the_df.tss, y=the_df.eur, name='>>'+q_route), 2, 1)
        the_df = df_sel[df_sel['flight'] == df_sel.flight.unique()[1]]
        fig.add_trace(go.Scatter(
            x=the_df.tss, y=the_df.eur, name='>>'+q_route), 1, 1)

    # less cluster
    fig.for_each_annotation(
        lambda a: a.update(text=a.text.replace("flight=", "")))
    fig.for_each_trace(
        lambda t: t.update(name=t.name.replace("route=", "")))

    return json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder)

def main(request):
    
    request_args = request.args

    if request_args and "q_ddate" in request_args:
        q_ddate = request_args["q_ddate"]
    else:
        q_ddate = "2021-01-01"
    if request_args and "q_rdate" in request_args:
        q_rdate = request_args["q_rdate"]
    else:
        q_rdate = "2021-01-06"
    if request_args and "q_route" in request_args:
        q_route = request_args["q_route"]
    else:
        q_route = "Helsinki Sydney|Sydney Helsinki"

    df = get_bq_df(q_ddate, q_rdate, q_route)
    jp = get_plot_json(df, q_route)
    return ("""
<!DOCTYPE html>
<meta charset="utf-8" />
<title>Plot Pricing Trend</title>
<script type="text/javascript">window.PlotlyConfig = {{MathJaxConfig: 'local'}};</script>
<script src="https://cdn.plot.ly/plotly-latest.min.js"></script>    

<body>
<div class="chart" id="bargraph">
    <script>
        var graphs = {};
        Plotly.plot('bargraph',graphs,{{}});
    </script>
</div>
<div>
    <p style="text-align: right;">Double click to filter; hover to view details</p>
</div>
</body>
""".format(jp))
