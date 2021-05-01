A collection of multiple Google Cloud Functions. 

# Active Functions

Currently the following cloud functions are actively used:

- (`Node.JS`) all-scheduled messaging service, including
    - BBC sports
    - Lumo (Line Messaging and BigQuery)
    - Time API as a utility
- (`Python`) treding functions
    - this is mainly updated using [Kaggle](https://www.kaggle.com/yyyaaan/cloud-function-plot-trends-from-bigquery)
- BotYYY webhook
    - not very active

> On May 2021, old implementations are deleted in `main`, for example, the python implementations of Line/Dialogflow webhook (currently Node.JS is more frequently utilized). See earlier commits if needed.

# Main modification history since May 2021

2021-05-01: deprecated cloud functions are removed.


# Line Messaging API Comsuption

[Line Dev](https://developers.line.biz/en/reference/messaging-api/#get-consumption)

[Picture Maker](https://pixlr.com/x/)

[Line Client API](https://line.github.io/line-bot-sdk-nodejs/api-reference/client.html)

# For conveninece

## Environment Variables

For Line messaging API `LINE` and `LINEY` is configured for Channel Access Token


## Google Cloud Shell Tips

Additional packages are required for debugging `Node.JS` and `puppeteer/chrome`.

```
gcloud config set project yyyaaannn
sudo apt install nodejs fonts-liberation libappindicator3-1 libauthen-sasl-perl libdata-dump-perl libdbusmenu-glib4 libdbusmenu-gtk3-4 libencode-locale-perl libfile-basedir-perl libfile-desktopentry-perl libfile-listing-perl libfile-mimeinfo-perl libfont-afm-perl libgbm1 libhtml-form-perl libhtml-format-perl libhtml-parser-perl libhtml-tagset-perl libhtml-tree-perl libhttp-cookies-perl libhttp-daemon-perl libhttp-date-perl libhttp-message-perl libhttp-negotiate-perl libindicator3-7 libio-html-perl libio-socket-ssl-perl libio-stringy-perl libipc-system-simple-perl liblwp-mediatypes-perl liblwp-protocol-https-perl libmailtools-perl libnet-dbus-perl libnet-http-perl libnet-smtp-ssl-perl libnet-ssleay-perl libtext-iconv-perl libtie-ixhash-perl libtimedate-perl libtry-tiny-perl libu2f-udev liburi-perl libvulkan1 libwayland-server0 libwww-perl libwww-robotrules-perl libx11-protocol-perl libxml-parser-perl libxml-twig-perl libxml-xpathengine-perl libxss1 perl-openssl-defaults x11-xserver-utils xdg-utils libdigest-hmac-perl libgssapi-perl libcrypt-ssleay-perl libauthen-ntlm-perl libunicode-map8-perl libunicode-string-perl xml-twig-tools nickle cairo-5c xorg-docs-core
```

For NodeJS environment, run `npm install` to install based on `package.json` (in Python, it is `pip install -r requirements.txt`); Export/import modules shall follow the coding convention below,

```
module.exports = { the_fun };
const {the_fun} = require('./exportimport.js');
```

## Useful command

```
git clone https://github.com/yyyaaan/gcp_fun
git pull origin main
git add .
git commit -m ""
git push -u origin main
```

```
du -h --max-depth=1 /path/to/directory
rm -rv ~/.local/share/Trash/*
```

Update for unauthenticated invoke `gcloud functions add-iam-policy-binding xxx --member="allUsers" --role="roles/cloudfunctions.invoker" --region=europe-west1`