(function() {
    'use strict';

    function _bucketConfigProvider() {

        var config = this;

        config.app = 'default';
        config.delimiter = '.';

        config.$get = function() {
            return {
                prefix: 'ngBucket',
                app: config.app,
                delimiter: config.delimiter
            };
        };
    }

    function _bucketsFactory(name) {

        return ['$window', '$rootScope', '$log', 'ngBucketConfig',
            function($window, $rootScope, $log, config) {
                var isStorageSupported = isSupport(name),
                    $buckets = {},
                    $manager = {
                        use: function(name, defaults) {
                            return ($buckets[name] = angular.extend({}, defaults || {}, $buckets[name]));
                        },
                        flush: function(name) {
                            delete $buckets[name];
                        },
                        deleteAll: function() {
                            $buckets = {};
                        },
                        sync: function() {
                            if (isStorageSupported) sync();
                        }
                    };

                if (isStorageSupported) {
                    var $scope = $rootScope.$new(true),
                        webstorage = $window[name],
                        appname = config.app,
                        prefix = config.prefix,
                        delimiter = config.delimiter;

                    $scope.buckets = $buckets;

                    whenStorage(function(event) {
                        var key = event.key,
                            value = event.newValue;
                        syncBucket(key, function($storage, param) {
                            $rootScope.$apply(function() {
                                if (value) {
                                    $storage[param] = value.slice(-1) == '"' ? value : angular.fromJson(value);
                                } else {
                                    delete $storage[param];
                                }
                            });
                        });
                    });

                    for (var i = 0, size = webstorage.length; i < size; i++) {
                        var key = webstorage.key(i);
                        syncBucket(key, function($storage, param) {
                            var item = webstorage.getItem(key);
                            $storage[param] = item.slice(-1) == '"' ? item : angular.fromJson(item);
                        });
                    }

                    var $snapshot = angular.copy($buckets);

                    $scope.$watch(debounce(sync, 200));
                }

                return $manager;

                function isSupport(name) {
                    try {
                        var storage = $window[name];
                        storage.setItem(name, name);
                        storage.getItem(name);
                        storage.removeItem(name);
                        return true;
                    } catch (e) {
                        $log.warn('ngBucket::Current browser does not support ' + name + '.');
                        return false;
                    }
                }

                function whenStorage(callback) {
                    if ($window.addEventListener) {
                        $window.addEventListener('storage', callback);
                    }
                    /* else {
                        $window.attachEvent('onstorage', callback);
                    }
                    */
                }


                function sync() {
                    if (!angular.equals($buckets, $snapshot)) {

                        for (var name in $buckets) {
                            syncStorage(
                                prefix + delimiter + appname + delimiter + name,
                                $buckets[name],
                                $snapshot[name] || {}
                            );
                        }

                        $snapshot = angular.copy($buckets);
                    }
                }

                function syncStorage(prefix, storage, last) {
                    if (!angular.equals(storage, last)) {

                        for (var key in last) {
                            if (!(key in storage)) webstorage.removeItem(prefix + delimiter + key);
                        }

                        for (var key in storage) {
                            if (!(key in last) || !angular.equals(storage, last[key])) {
                                webstorage.setItem(
                                    prefix + delimiter + key,
                                    typeof value === 'string' ? storage[key] : angular.toJson(storage[key])
                                );
                            }
                        }

                    }

                }

                function syncBucket(key, handler) {
                    var identifiers = key.split(delimiter);
                    if (identifiers.length >= 3 && prefix == identifiers[0] && appname == identifiers[1]) {
                        handler($manager.use(identifiers[2]), identifiers[3]);
                    }
                }

                function now() {
                    return Date.now || new Date().getTime();
                }

                function debounce(func, wait, immediate) {
                    var timeout, args, context, timestamp, result;

                    var later = function() {
                        var last = now() - timestamp;

                        if (last < wait && last > 0) {
                            timeout = setTimeout(later, wait - last);
                        } else {
                            timeout = null;
                            if (!immediate) {
                                result = func.apply(context, args);
                                if (!timeout) context = args = null;
                            }
                        }
                    };

                    return function() {
                        context = this;
                        args = arguments;
                        timestamp = now();
                        var callNow = immediate && !timeout;
                        if (!timeout) timeout = setTimeout(later, wait);
                        if (callNow) {
                            result = func.apply(context, args);
                            context = args = null;
                        }

                        return result;
                    };
                }
            }
        ];
    }

    angular
        .module('ngBucket', [])
        .provider('ngBucketConfig', _bucketConfigProvider)
        .factory('LocalBuckets', _bucketsFactory('localStorage'))
        .factory('SessionBuckets', _bucketsFactory('sessionStorage'));

})();
