const ng = require('ngrok');

module.exports = function(RED) {
    function ngrok(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        this.creds = RED.nodes.getNode(config.creds);
        this.subdomain = config.subdomain;
        this.region = config.region;
        this.auth = config.auth;
        this.proto = config.proto;
        this.bind_tls = config.bind_tls;
        if (RED.nodes.getNode(config.creds) == null){
          this.authtoken = "";
        } else {
          this.authtoken = RED.nodes.getNode(config.creds).credentials.authtoken;
        }
        if (config.port == ""){
          this.port = RED.settings.uiPort;
        } else{
          this.port = config.port;
        }
        node.on('input', function(msg) {
          var options = {
                proto: this.proto,
                addr: this.port,
                subdomain: this.subdomain,
                authtoken: this.authtoken,
                region: this.region,
                bind_tls: this.bind_tls
            }
            
            if (this.auth) {
              const auth = this.auth.split(':');

              if (auth && auth.length === 2) {
                options.auth = this.auth;
              }
            }

            clean(options);
            if (msg.payload == 'on' || msg.payload == true){
              (async function(){
                try {
                  //Disconnect once before reconnecting
                  await ng.kill();
                  const url = await ng.connect(options);
                  msg.payload = url;
                  node.send(msg);
                  node.status({fill:"green",shape:"dot",text:url});
                } catch ({message}) {
                  console.log(`Connect error: ${message}`);
                }
              })();
          }
          else{
              (async function(){
                  await ng.kill();
                  msg.payload = null;
                  node.send(msg);
                  node.status({fill:"red",shape:"ring",text:"disconnected"});
              })();
          }


        });
  }
  function ngrokauth(n){
     RED.nodes.createNode(this, n);
     this.authtoken = n.authtoken;
  }

 RED.nodes.registerType("ngrok",ngrok);
 RED.nodes.registerType("ngrokauth",ngrokauth,{
   credentials: {
     authtoken: {type:"text"}
   }
 });


 RED.httpAdmin.post("/ngrokInject/:id", RED.auth.needsPermission("inject.write"), function(req,res) {
  var node = RED.nodes.getNode(req.params.id);
  if (node != null) {
      try {
          var state = (req.body.on == 'true');
          node.receive({payload: state});
          res.sendStatus(200);
      } catch(err) {
          res.sendStatus(500);
          node.error(RED._("inject.failed",{error:err.toString()}));
      }
  } else {
      res.sendStatus(404);
  }
});
}

function clean(obj) {
  for (var propName in obj) {
    if (obj[propName] === null || obj[propName] === undefined || obj[propName] === "") {
      delete obj[propName];
    }
  }

}
