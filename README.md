A collection of multiple Google Cloud Functions. Currently implemented:

- __qr-trend__ (GET q_route, q_ddate, q_rdate [Link](https://europe-west1-yyyaaannn.cloudfunctions.net/qr-trend?q_route=Helsinki%20Canberra|Sydney%20Helsinki&q_ddate=2021-06-01&q_rdate=2021-06-17))
- __bq-lumo__ (GET maxn [Link](https://europe-west1-yyyaaannn.cloudfunctions.net/bq-lumo?max_n=1)) _Submitted to Cloud Scheduler_
- __send-games__ broadcasting require GET days;

All GET parameters are optional.

# Messaging API Comsuption

[Line Dev](https://developers.line.biz/en/reference/messaging-api/#get-consumption)

[Picture Maker](https://pixlr.com/x/) [Client API](https://line.github.io/line-bot-sdk-nodejs/api-reference/client.html)

# Cloud Shell Tips

Additional packages are required for debugging nodejs and puppeteer/chrome.

```
gcloud config set project yyyaaannn
sudo apt install nodejs fonts-liberation libappindicator3-1 libauthen-sasl-perl libdata-dump-perl libdbusmenu-glib4 libdbusmenu-gtk3-4 libencode-locale-perl libfile-basedir-perl libfile-desktopentry-perl libfile-listing-perl libfile-mimeinfo-perl libfont-afm-perl libgbm1 libhtml-form-perl libhtml-format-perl libhtml-parser-perl libhtml-tagset-perl libhtml-tree-perl libhttp-cookies-perl libhttp-daemon-perl libhttp-date-perl libhttp-message-perl libhttp-negotiate-perl libindicator3-7 libio-html-perl libio-socket-ssl-perl libio-stringy-perl libipc-system-simple-perl liblwp-mediatypes-perl liblwp-protocol-https-perl libmailtools-perl libnet-dbus-perl libnet-http-perl libnet-smtp-ssl-perl libnet-ssleay-perl libtext-iconv-perl libtie-ixhash-perl libtimedate-perl libtry-tiny-perl libu2f-udev liburi-perl libvulkan1 libwayland-server0 libwww-perl libwww-robotrules-perl libx11-protocol-perl libxml-parser-perl libxml-twig-perl libxml-xpathengine-perl libxss1 perl-openssl-defaults x11-xserver-utils xdg-utils libdigest-hmac-perl libgssapi-perl libcrypt-ssleay-perl libauthen-ntlm-perl libunicode-map8-perl libunicode-string-perl xml-twig-tools nickle cairo-5c xorg-docs-core
```

For Python enviroment, run `pip install -r requirements.txt`.

For NodeJS environment, run `npm install` to install based on `package.json`; Export/import modules shall follow,

```
module.exports = { the_fun };
const {the_fun} = require('./exportimport.js');
```


# Environment Variables

For Line messaging API `LINE` and `LINEY` is configured for Channel Access Token

# Useful command

```
git clone https://github.com/yyyaaan/gcp_fun
git pull origin master
git add .
git commit -m ""
git push -u origin master
```

```
du -h --max-depth=1 /path/to/directory
rm -rv ~/.local/share/Trash/*
```

Reference for [Fire-and-Go https request](http://yurigor.com/how-to-make-http-request-from-node-js-without-waiting-for-response/)

Update for unauthenticated invoke `gcloud functions add-iam-policy-binding xxx --member="allUsers" --role="roles/cloudfunctions.invoker" --region=europe-west1`