// Generated by CoffeeScript 1.3.3
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

define('hoodie/remote', ['hoodie/errors'], function(ERROR) {
  var Remote;
  return Remote = (function() {

    Remote.prototype.active = true;

    function Remote(hoodie) {
      this.hoodie = hoodie;
      this._handle_push = __bind(this._handle_push, this);

      this._handle_pull_results = __bind(this._handle_pull_results, this);

      this._handle_pull_error = __bind(this._handle_pull_error, this);

      this._handle_pull_success = __bind(this._handle_pull_success, this);

      this._restart_pull_request = __bind(this._restart_pull_request, this);

      this.sync = __bind(this.sync, this);

      this.push = __bind(this.push, this);

      this.pull = __bind(this.pull, this);

      this.disconnect = __bind(this.disconnect, this);

      this.connect = __bind(this.connect, this);

      if (this.hoodie.config.get('_remote.active') != null) {
        this.active = this.hoodie.config.get('_remote.active');
      }
      if (this.active) {
        this.connect();
      }
    }

    Remote.prototype.connect = function() {
      this.hoodie.config.set('_remote.active', this.active = true);
      this.hoodie.on('account:signed_out', this.disconnect);
      this.hoodie.on('account:signed_in', this.sync);
      return this.hoodie.account.authenticate().pipe(this.sync);
    };

    Remote.prototype.disconnect = function() {
      var _ref, _ref1;
      this.hoodie.config.set('_remote.active', this.active = false);
      this.hoodie.unbind('account:signed_in', this.sync);
      this.hoodie.unbind('account:signed_out', this.disconnect);
      this.hoodie.unbind('store:dirty:idle', this.push);
      this.hoodie.unbind('account:signed_in', this.connect);
      if ((_ref = this._pull_request) != null) {
        _ref.abort();
      }
      return (_ref1 = this._push_request) != null ? _ref1.abort() : void 0;
    };

    Remote.prototype.pull = function() {
      this._pull_request = this.hoodie.request('GET', this._pull_url(), {
        contentType: 'application/json'
      });
      if (this.active) {
        window.clearTimeout(this._pull_request_timeout);
        this._pull_request_timeout = window.setTimeout(this._restart_pull_request, 25000);
      }
      return this._pull_request.then(this._handle_pull_success, this._handle_pull_error);
    };

    Remote.prototype.push = function(docs) {
      var doc;
      if (!$.isArray(docs)) {
        docs = this.hoodie.store.changed_docs();
      }
      if (docs.length === 0) {
        return this._promise().resolve([]);
      }
      docs = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = docs.length; _i < _len; _i++) {
          doc = docs[_i];
          _results.push(this._parse_for_remote(doc));
        }
        return _results;
      }).call(this);
      return this._push_request = this.hoodie.request('POST', "/" + (encodeURIComponent(this.hoodie.account.db())) + "/_bulk_docs", {
        dataType: 'json',
        processData: false,
        contentType: 'application/json',
        data: JSON.stringify({
          docs: docs
        }),
        success: this._handle_push
      });
    };

    Remote.prototype.sync = function(docs) {
      if (this.active) {
        this.hoodie.unbind('store:dirty:idle', this.push);
        this.hoodie.on('store:dirty:idle', this.push);
      }
      return this.push(docs).pipe(this.pull);
    };

    Remote.prototype.get_seq = function() {
      return this._seq || (this._seq = this.hoodie.config.get('_remote.seq') || 0);
    };

    Remote.prototype.set_seq = function(seq) {
      return this._seq = this.hoodie.config.set('_remote.seq', seq);
    };

    Remote.prototype.on = function(event, cb) {
      return this.hoodie.on("remote:" + event, cb);
    };

    Remote.prototype._pull_url = function() {
      var since;
      since = this.get_seq();
      if (this.active) {
        return "/" + (encodeURIComponent(this.hoodie.account.db())) + "/_changes?include_docs=true&heartbeat=10000&feed=longpoll&since=" + since;
      } else {
        return "/" + (encodeURIComponent(this.hoodie.account.db())) + "/_changes?include_docs=true&since=" + since;
      }
    };

    Remote.prototype._restart_pull_request = function() {
      var _ref;
      return (_ref = this._pull_request) != null ? _ref.abort() : void 0;
    };

    Remote.prototype._handle_pull_success = function(response) {
      this.set_seq(response.last_seq);
      this._handle_pull_results(response.results);
      if (this.active) {
        return this.pull();
      }
    };

    Remote.prototype._handle_pull_error = function(xhr, error, resp) {
      switch (xhr.status) {
        case 403:
          this.hoodie.trigger('remote:error:unauthenticated', error);
          this.disconnect();
          if (this.active) {
            return this.hoodie.one('account:signed_in', this.connect);
          }
          break;
        case 404:
          return window.setTimeout(this.pull, 3000);
        case 500:
          this.hoodie.trigger('remote:error:server', error);
          return window.setTimeout(this.pull, 3000);
        default:
          if (!this.active) {
            return;
          }
          if (xhr.statusText === 'abort') {
            if (this.active) {
              return this.pull();
            }
          } else {
            if (this.active) {
              return window.setTimeout(this.pull, 3000);
            }
          }
      }
    };

    Remote.prototype._valid_special_attributes = ['_id', '_rev', '_deleted'];

    Remote.prototype._parse_for_remote = function(obj) {
      var attr, attributes;
      attributes = $.extend({}, obj);
      for (attr in attributes) {
        if (~this._valid_special_attributes.indexOf(attr)) {
          continue;
        }
        if (!/^_/.test(attr)) {
          continue;
        }
        delete attributes[attr];
      }
      attributes._id = "" + attributes.type + "/" + attributes.id;
      delete attributes.id;
      return attributes;
    };

    Remote.prototype._parse_from_pull = function(obj) {
      var id, _ref;
      id = obj._id || obj.id;
      delete obj._id;
      _ref = id.split(/\//), obj.type = _ref[0], obj.id = _ref[1];
      if (obj.created_at) {
        obj.created_at = new Date(Date.parse(obj.created_at));
      }
      if (obj.updated_at) {
        obj.updated_at = new Date(Date.parse(obj.updated_at));
      }
      if (obj.rev) {
        obj._rev = obj.rev;
        delete obj.rev;
      }
      return obj;
    };

    Remote.prototype._parse_from_push = function(obj) {
      var id, _ref;
      id = obj._id || delete obj._id;
      _ref = obj.id.split(/\//), obj.type = _ref[0], obj.id = _ref[1];
      obj._rev = obj.rev;
      delete obj.rev;
      delete obj.ok;
      return obj;
    };

    Remote.prototype._handle_pull_results = function(changes) {
      var doc, promise, _changed_docs, _destroyed_docs, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _results,
        _this = this;
      _destroyed_docs = [];
      _changed_docs = [];
      for (_i = 0, _len = changes.length; _i < _len; _i++) {
        doc = changes[_i].doc;
        doc = this._parse_from_pull(doc);
        if (doc._deleted) {
          _destroyed_docs.push([
            doc, this.hoodie.store.destroy(doc.type, doc.id, {
              remote: true
            })
          ]);
        } else {
          _changed_docs.push([
            doc, this.hoodie.store.save(doc.type, doc.id, doc, {
              remote: true
            })
          ]);
        }
      }
      for (_j = 0, _len1 = _destroyed_docs.length; _j < _len1; _j++) {
        _ref = _destroyed_docs[_j], doc = _ref[0], promise = _ref[1];
        promise.then(function(object) {
          _this.hoodie.trigger('remote:destroyed', doc.type, doc.id, object);
          _this.hoodie.trigger("remote:destroyed:" + doc.type, doc.id, object);
          _this.hoodie.trigger("remote:destroyed:" + doc.type + ":" + doc.id, object);
          _this.hoodie.trigger('remote:changed', 'destroyed', doc.type, doc.id, object);
          _this.hoodie.trigger("remote:changed:" + doc.type, 'destroyed', doc.id, object);
          return _this.hoodie.trigger("remote:changed:" + doc.type + ":" + doc.id, 'destroyed', object);
        });
      }
      _results = [];
      for (_k = 0, _len2 = _changed_docs.length; _k < _len2; _k++) {
        _ref1 = _changed_docs[_k], doc = _ref1[0], promise = _ref1[1];
        _results.push(promise.then(function(object, object_was_created) {
          var event;
          event = object_was_created ? 'created' : 'updated';
          _this.hoodie.trigger("remote:" + event, doc.type, doc.id, object);
          _this.hoodie.trigger("remote:" + event + ":" + doc.type, doc.id, object);
          _this.hoodie.trigger("remote:" + event + ":" + doc.type + ":" + doc.id, object);
          _this.hoodie.trigger("remote:changed", event, doc.type, doc.id, object);
          _this.hoodie.trigger("remote:changed:" + doc.type, event, doc.id, object);
          return _this.hoodie.trigger("remote:changed:" + doc.type + ":" + doc.id, event, object);
        }));
      }
      return _results;
    };

    Remote.prototype._handle_push = function(doc_responses) {
      var doc, response, update, _i, _len, _results;
      _results = [];
      for (_i = 0, _len = doc_responses.length; _i < _len; _i++) {
        response = doc_responses[_i];
        if (response.error === 'conflict') {
          _results.push(this.hoodie.trigger('remote:error:conflict', response.id));
        } else if (!this.active) {
          doc = this._parse_from_push(response);
          update = {
            _rev: doc._rev
          };
          _results.push(this.hoodie.store.update(doc.type, doc.id, update, {
            remote: true
          }));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    Remote.prototype._promise = $.Deferred;

    return Remote;

  })();
});
