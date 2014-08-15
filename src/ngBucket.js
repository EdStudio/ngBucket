(function() {
    'use strict';

    function _bucketConfigProvider() {

        var app, version;

        this.delimiter = '.';
        this.register = function(app, version) {
            app = app;
            version = version;
        };

        this.$get = function() {
            var config = {};
            config.app = app || 'default';
            config.version = version || '1';
            config.delimiter = this.delimiter;
            config.prefix = 'eds';

            return config;
        };
    }

    function _bucketsFactory(name) {

        return ['$rootScope', '$window', '$log', 'ngBucketConfig',
            function($rootScope, $window, $log, config) {

                var $buckets = {},
                    $manager = {
                        use: function(name, defaults) {
                            return $buckets[name] = angular.extend(defaults || {}, $buckets[name]);
                        },
                        flush: function(name) {
                            delete $buckets[name];
                        },
                        deleteAll: function() {
                            for (var name in $buckets) {
                                this.flush(name);
                            }
                        }
                    };

                if (isSupport(name)) {
                    var webstorage = $window[name],
                        prefix = config.prefix,
                        appname = config.app,
                        delimiter = config.delimiter;

                    for (var i = 0, prefixLength = prefix.length, size = webstorage.length; i < size; i++) {
                        var key = webstorage.key(i),
                            identifiers = key.split(delimiter);
                        if (identifiers.length >= 3 && identifiers[0] == prefix && identifiers[1] == appname) {
                            ($manager.use(identifiers[2]))[identifiers[3]] = angular.fromJson(webstorage.getItem(key));
                        }
                    }

                    var $snapshot = angular.copy($buckets);

                    $rootScope.$watch(debounce(syncStorage, 200));
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
                        $log.warn('EdStorage::Current browser does not support ' + name + '.');
                        return false;
                    }
                }

                function debounce(func, wait, immediate) {
                    var timeout, args, context, timestamp, result, now = Date.now || function() {
                        return +new Date;
                    };

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

                function syncStorage() {
                    if (!angular.equals($buckets, $snapshot)) {

                        for (var name in $buckets) {
                            syncBucket([prefix, appname, name], $buckets[name], $snapshot[name] || {});
                        }

                        $snapshot = angular.copy($buckets);
                    }
                }

                function syncBucket(prefixes, bucket, snapshot) {
                    if (!angular.equals(bucket, snapshot)) {
                        for (var nkey in bucket) {
                            if (!(nkey in snapshot) || !angular.equals(bucket, snapshot[nkey])) {
                                webstorage.setItem(
                                    prefixes.concat([nkey]).join(delimiter),
                                    typeof value === 'string' ? bucket[nkey] : angular.toJson(bucket[nkey])
                                );
                            }

                            delete snapshot[nkey];
                        }

                        for (var key in snapshot) {
                            webstorage.removeItem(prefixes.concat([key]).join(delimiter));
                        }
                    }
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
