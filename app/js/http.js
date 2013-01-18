

var http = (function(config) {


  var timeOut = 10000; //ms

  // transform a map into a url query string
  var encodeQueryData = function (data) {
    var pairs = [];
    for (var property in data) {
      if (data.hasOwnProperty(property)) {
        var value = data[property];
        pairs.push(encodeURIComponent(property) + "=" + encodeURIComponent(value));
      }
    }
    return pairs.join("&");
  }


  //  cfg = {
  //    url: 'www.myurl.com',
  //    params: {
  //      param1: 'value',
  //      param2: 0
  //    },
  //    data: 'mydata'
  //  }
  var http = function (url, cfg, onSuccess, onFailure) {

    var xhr = new XMLHttpRequest();

    // execute when an error is detected
    function handleError() {
      if (onFailure instanceof Function) {
        onFailure();
      }
    }

    xhr.timeout = timeOut;
    xhr.ontimeout = handleError;

    // execute when request finishes successfully
    function handleSuccess(response) {
      if (onSuccess instanceof Function) {
        onSuccess(response);
      }
    }

    // handle the response
    xhr.onreadystatechange = function(){
      if (xhr.readyState === 4) {
        if (xhr.status < 400 && xhr.responseText !== undefined) {
          handleSuccess(xhr.responseText)
        } else {
          handleError(xhr);
        }
      }
    }

    // handle xhr error
    xhr.onerror = function(error) {
      handleError(error);
    }

    // construct url
    var url =
      url + (url.search(/\?/) < 0 ? '?' : '&') + encodeQueryData(cfg.params);

    try {
      // make the actual request
      xhr.open(cfg.method, url, true);
      xhr.send(cfg.data);
    } catch(e) {
      handleError();
    }

  };



  http.get = function (url, cfg, onSuccess, onFailure) {
    cfg.method = 'GET';
    http(url, cfg, onSuccess, onFailure);
  };

  http.getJson = function (url, cfg, onSuccess, onFailure) {
    var handleSuccess = function handleSuccess(response) {
      try{
        var json = JSON.parse(response);
        onSuccess(json);
      } catch(e) {
        if (onFailure instanceof Function) {
          onFailure(e);
        }
      }
    };

    http.get(url, cfg, handleSuccess, onFailure);
  };

  http.post = function (url, cfg, onSuccess, onFailure) {
    cfg.method = 'POST';
    http(url, cfg, onSuccess, onFailure);
  };

  return http;

}());
