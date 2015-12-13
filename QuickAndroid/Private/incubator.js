.pragma library
.import QtQuick 2.0 as QtQuick

function Incubator(source, parent, options) {
    this.parent = parent;
    this.source = source;
    this.options = options;
    this.component = null;
    this.errorString = "";
    this.object = null;
    this.status = QtQuick.Component.Null;
    this.callbacks = [];

    // QTBUG-35587
    this.incubationObject = null;
}

Incubator.prototype.__quickAndroidIncubatorSignature__ = true;

Incubator.prototype.addListener = function(callback) {
    this.callbacks.push(callback);
}

Incubator.prototype.create = function() {
    this.status = QtQuick.Component.Loading;
    if (typeof this.source === "string") {
        this._createComponent();
    } else {
        this.component = this.source;
        this._incubateObject();
    }
}

Incubator.prototype._createComponent = function() {
    var incubator = this;
    var component = Qt.createComponent(this.source, QtQuick.Component.Asynchronous);
    this.component = component;

    function last() {
        if (component.status === QtQuick.Component.Ready) {
            incubator._incubateObject();
        } else {
            incubator._onFinished(component.errorString());
        }
    }

    if (component.status === QtQuick.Component.Loading) {
        component.statusChanged.connect(last);
    } else {
        last();
    }
}

Incubator.prototype._incubateObject = function() {
    var incubator = this;
    var result = this.component.incubateObject(this.parent,this.options || {}, Qt.Asynchronous);

    this.incubationObject = result;

    function last() {
        if (result.status === QtQuick.Component.Error) {
            incubator._onFinsihed("Failed to create object", null);
        } else if (result.status === QtQuick.Component.Ready) {
            incubator._onFinished(null,result.object);
        }
    }

    if (result.status === QtQuick.Component.Loading) {
        result.onStatusChanged = function (status) {
            last();
        }
    } else {
        last();
    }
}

Incubator.prototype._onFinished = function(err, object) {
    this.object = object;
    this.incubationObject = null;

    if (err !== null) {
        this.status = QtQuick.Component.Error;
    } else {
        this.status = QtQuick.Component.Ready;
    }

    for (var i in this.callbacks) {
        this.callbacks[i](err, object);
    }
}

// Return TRUE if Incubator supports the input source
function support(source) {
    return (typeof source === "string") || String(source).indexOf("QQmlComponent") === 0
}

// Return TRUE if the object instance is an incubator object
function isIncubator(object) {
    return typeof(object) === "object" && object.__quickAndroidIncubatorSignature__ === true;
}

// Create an incubator
function create(source, parent, options) {
    return new Incubator(source, parent, options);
}

