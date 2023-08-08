var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  JsonRpcMessageSerializer: () => JsonRpcMessageSerializer,
  ProxyServiceFactory: () => ProxyServiceFactory,
  SimpleRequestIdRegistry: () => SimpleRequestIdRegistry,
  SimpleServiceProxy: () => SimpleServiceProxy,
  serviceProxy: () => serviceProxy
});
module.exports = __toCommonJS(src_exports);

// src/messageSerializer.ts
function isRequestMessage(message) {
  return hasId(message) && "service" in message && "method" in message;
}
function isErrorMessage(message) {
  return hasId(message) && "error" in message;
}
function isResponseMessage(message) {
  return hasId(message) && "result" in message;
}
function hasId(message) {
  return "id" in message && Number.isInteger(message.id);
}
var JsonRpcMessageSerializer = class {
  deserializeMessage(message) {
    return JSON.parse(message);
  }
  serializeResponse(responseMessage) {
    return JSON.stringify(responseMessage);
  }
  serializeRequest(requestMessage) {
    return JSON.stringify(requestMessage);
  }
  serializeError(errorMessage) {
    return JSON.stringify(errorMessage);
  }
};

// src/requestIdRegistry.ts
var SimpleRequestIdRegistry = class {
  counter = 0;
  requestMap = /* @__PURE__ */ new Map();
  registerRequest() {
    let resolve = () => {
    };
    let reject = () => {
    };
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    this.requestMap.set(this.counter, { resolve, reject });
    return { id: this.counter++, promise };
  }
  resolveRequest(id, value) {
    const request = this.requestMap.get(id);
    if (request === void 0)
      throw new Error(`Can't process response: request with Id=${id} doesn't exists`);
    request.resolve(value);
    this.requestMap.delete(id);
  }
  rejectRequest(id, error) {
    const request = this.requestMap.get(id);
    if (request === void 0)
      throw new Error(`Can't process response rejection: request with Id=${id} doesn't exists`);
    request.reject(error);
    this.requestMap.delete(id);
  }
};

// src/serviceFactory.ts
var ProxyServiceFactory = class {
  serviceProxies = /* @__PURE__ */ new Map();
  getService(serviceId, sendMessage) {
    const existingProxy = this.serviceProxies.get(serviceId);
    if (existingProxy)
      return existingProxy;
    const newProxy = new Proxy({}, { get: getFunc(serviceId, sendMessage) });
    this.serviceProxies.set(serviceId, newProxy);
    return newProxy;
  }
};
function getFunc(serviceId, sendMessage) {
  return (_target, prop, _receiver) => {
    return new Proxy(() => {
    }, { apply: applyFunc(serviceId, prop, sendMessage) });
  };
}
function applyFunc(serviceId, actionName, sendMessage) {
  return (_target, _thisArg, argumentsList) => {
    return sendMessage(serviceId, actionName.toString(), argumentsList);
  };
}

// src/serviceProxy.ts
var SimpleServiceProxy = class {
  messageSender;
  factory;
  messageSerializer;
  requestStore;
  serviceImplementations = /* @__PURE__ */ new Map();
  errorHandler;
  constructor(messageSender, messageSerializer, requestStore, serviceFactory, errorHandler) {
    this.messageSender = messageSender;
    this.factory = serviceFactory;
    this.messageSerializer = messageSerializer;
    this.requestStore = requestStore;
    this.messageSender.subscribe(this.processMessage.bind(this));
    this.errorHandler = errorHandler;
  }
  getService(serviceId) {
    return this.factory.getService(serviceId, this.sendRequestMessage.bind(this));
  }
  register(serviceId, service) {
    this.serviceImplementations.set(serviceId, service);
    return this;
  }
  processRequestMessage(message, context) {
    const serviceImplementation = this.serviceImplementations.get(message.service);
    if (!serviceImplementation) {
      this.errorHandler({ errCode: "SERVICE_IS_NOT_IMPLEMENTED", details: { message, context } });
      this.sendErrorMessage({ id: message.id, error: { message: "SERVICE_IS_NOT_IMPLEMENTED" } });
      return;
    }
    if (!(message.method in serviceImplementation)) {
      this.errorHandler({ errCode: "ACTION_NOT_FOUND", details: { message, context } });
      this.sendErrorMessage({ id: message.id, error: { message: "ACTION_NOT_FOUND" } });
      return;
    }
    const promise = serviceImplementation[message.method].call(serviceImplementation, ...message.params, context);
    promise.catch((err) => {
      this.sendErrorMessage({ id: message.id, error: { message: err.message } });
    }).then((value) => {
      this.sendResponseMessage(message.id, value);
    });
  }
  processResponseMessage(message) {
    try {
      this.requestStore.resolveRequest(message.id, message.result);
    } catch (err) {
      this.errorHandler({ errCode: "INVALID_REQUEST_ID", details: { err, message } });
    }
  }
  processErrorMessage(message) {
    try {
      this.requestStore.rejectRequest(message.id, message.error);
    } catch (err) {
      this.errorHandler({ errCode: "INVALID_REQUEST_ID", details: { err, message } });
    }
  }
  processInvalidMessage(message, context) {
    this.errorHandler({ errCode: "INVALID_MESSAGE_FORMAT", details: { message, context } });
  }
  sendRequestMessage(service, method, params) {
    const { id: requestId, promise } = this.requestStore.registerRequest();
    const message = this.messageSerializer.serializeRequest({ id: requestId, service, method, params });
    this.messageSender.sendMessage(message);
    return promise;
  }
  sendResponseMessage(id, result) {
    const message = this.messageSerializer.serializeResponse({ id, result });
    this.messageSender.sendMessage(message);
  }
  sendErrorMessage(error) {
    const message = this.messageSerializer.serializeError(error);
    this.messageSender.sendMessage(message);
  }
  processMessage(message, context) {
    const deserializedMessage = this.messageSerializer.deserializeMessage(message);
    if (isRequestMessage(deserializedMessage)) {
      this.processRequestMessage(deserializedMessage, context);
    } else if (isResponseMessage(deserializedMessage)) {
      this.processResponseMessage(deserializedMessage);
    } else if (isErrorMessage(deserializedMessage)) {
      this.processErrorMessage(deserializedMessage);
    } else {
      this.processInvalidMessage(deserializedMessage, context);
    }
  }
};

// src/index.ts
function serviceProxy(messageSender) {
  return new SimpleServiceProxy(messageSender, new JsonRpcMessageSerializer(), new SimpleRequestIdRegistry(), new ProxyServiceFactory(), (err) => {
    console.error(err);
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  JsonRpcMessageSerializer,
  ProxyServiceFactory,
  SimpleRequestIdRegistry,
  SimpleServiceProxy,
  serviceProxy
});
//# sourceMappingURL=index.js.map