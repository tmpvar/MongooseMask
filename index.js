'use strict';

/**
 * Express Middleware to filter out Mongoose model attributes.
 * You pass an array of fields you do not want returned as part of
 * json or jsonp requests for example.
 * app.use(mongoosemask(['_id', '_privatefield']));
 * These will then be removed from your json objects before sending to the
 * client.
 *
 * Additionally if you have a complex item that needs masking  you can pass a
 * callback funtion that will be invoked before your object is serialized to json.
 *
 * The callback must have the following signature.
 * function(obj, mask, done);
 *
 * @usage express.use(mongooseMask(function(value, mask, done){
 *             var masked = mask(value, ['_id', '__v']);
 *             if(masked.data){
 *                 masked.data = mask(value.data, ['_id', '__v']);
 *             }
 *             done(null, masked);
 *         }));
 *
 * ** NOTE
 * If you are using 'express-partial-response' you must place this middleware
 * AFTER you place the express-partial-response middleware as this middlware only works
 * with mongoose objects which the express-partial-response middleware does not return
 */

var _ = require('lodash');

exports = module.exports = function (values) {
    var mask = module.exports.mask;

    function wrap(original) {
        return function (obj) {
            if (_.isFunction(values)) {
                values(obj, mask, function (err, masked) {
                    original(masked);
                });
            } else {
                var duplicate = mask(obj, values);
                original(duplicate);
            }
        };
    }

    return function (req, res, next) {
        res.json = wrap(res.json.bind(res));
        res.jsonp = wrap(res.jsonp.bind(res));
        next();
    };
};

/**
 * Expose all values on an object except for the masked items
 * passed in the values array.
 * @param obj
 * @param values
 * @returns {*}
 */
module.exports.mask = function mask(obj, values) {
    if (_.isArray(obj)) {
        var results = [];
        _.each(obj, function (item) {
            results.push(masked(item, values));
        });
        return results;
    }
    return masked(obj, values);
};

/**
 * Mask all values on a given object except for those that
 * are explicitly exposed through the values array. The value
 * can be a String which will directly be a one-to-one mapping
 * for example
 *     _id -> _id will expose the _id mongoose value
 * or an object that maps keys to values
 * for example
 *     {_id:'id'} will expose _id as id on the object.
 * [ '_id', {_id:'id} ] will expose both id and _id
 * @param obj
 * @param values
 */
module.exports.expose = function expose(obj, values) {
    if (_.isArray(obj)) {
        var results = [];
        _.each(obj, function (item) {
            results.push(exposed(item, values));
        });
        return results;
    }
    return exposed(obj, values);
};

//-------------------------------------------------------------------------
//
// Private Methods
//
//-------------------------------------------------------------------------

function masked(obj, values) {
    var duplicate;
    if (_.isFunction(obj.toObject)) {
        duplicate = obj.toObject();
    } else {
        duplicate = _.clone(obj);
    }
    _.each(values, function (value) {
        delete duplicate[value];
    });
    return duplicate;
}

function exposed(obj, values) {
    var duplicate = {};
    _.each(values, function (item) {
        if (_.isObject(item)) {
            _.forIn(item, function (value, key) {
                duplicate[value] = obj[key];
            });
        } else {
            duplicate[item] = obj[item];
        }
    });
    return duplicate;
}