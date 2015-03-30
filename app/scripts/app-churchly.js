'use strict';

window.addEventListener('error', function (err) {
  console.error("Uncaught Exception:");
  console.log(err);
});

angular.module('yololiumApp', [
  'ui.bootstrap'
, 'ui.router'
, 'steve'
/*
  'ngSanitize'
*/
]).config([
    '$urlRouterProvider'
  , '$stateProvider'
  , '$httpProvider'
  , 'stConfig'
  , function ($urlRouterProvider, $stateProvider, $httpProvider, StApi) {
    var rootTemplate = $('.ui-view-body').html();

    $urlRouterProvider.otherwise('/');
    $stateProvider
      .state('root', {
        url: '/'
      , views: {
          body: {
            template: rootTemplate
          , controller: ['$scope', 'StSession', 'LdsIo', function ($scope, StSession, LdsIo) {
              var MC = this;

              MC.urlsafe = function (name) {
                return name.toLowerCase().replace(/[^\-\w]/, '').replace(/s$/, '');
              };

              function init(session) {
                if (!session) {
                  MC.session = null;
                  return;
                }

                MC.session = session;
                
                LdsIo.getProfile(session.account).then(function (profile) {
                  MC.user = profile;
                  MC.account = session.account;
                  MC.session = profile;
                });
              }

              StSession.subscribe(init, $scope);

              StSession.restoreSession();
            }]
          , controllerAs: 'MC'
          }
        }
      })

      .state('oauth', {
        url: '/authorize/:token/'
      , views: {
          body: {
            templateUrl: 'views/oauth.html'
          , controller: 'OauthCtrl as O'
          , resolve: {
              mySession: ['StSession', function (StSession) {
                return StSession.get().then(function (session) {
                  return session;
                });
              }]
            }
          }
        }
      })

      .state('account', {
        url: '/account/'
      , views: {
          body: {
            templateUrl: 'views/account.html'
          , controller: 'AccountCtrl as A'
          , resolve: {
              mySession: ['StSession', function (StSession) {
                return StSession.get();
              }]
            }
          }
        }
      })

      .state('api', {
        url: '/api/'
      , views: {
          body: {
            templateUrl: 'views/api.html'
          }
        }
      })

      .state('develop', {
        url: '/develop/'
      , views: {
          body: {
            templateUrl: 'views/oauthclients.html'
          , controller: 'OauthclientsController as OA'
          , resolve: {
              authenticatedSession: ['StSession', function (StSession) {
                return StSession.ensureSession();
              }]
            }
          }
        }
      })
      ;

    // send creds
    $httpProvider.defaults.withCredentials = true;
    // alternatively, register the interceptor via an anonymous factory?
    $httpProvider.interceptors.push([ '$q', function($q) {
      var recase = window.Recase.create({ exceptions: {} });

      function isApiUrl(url) {
        // TODO provide a list of known-good API urls in StApi and loop
        return !/^https?:\/\//.test(url)
          || url.match(StApi.apiPrefix)
          || url.match(StApi.oauthPrefix)
          ;
      }

      return {
        'request': function (config) {
          if (config.data
              && isApiUrl(config.url)
              && /json/.test(config.headers['Content-Type'])
          ) {
            config.data = recase.snakeCopy(config.data);
          }

          return config;
        }
      , 'requestError': function (rejection) {
          return rejection;
        }
      , 'response': function (response) {
          var config = response.config;

          // our own API is snake_case (to match webApi / ruby convention)
          // but we convert to camelCase for javascript convention
          if (isApiUrl(config.url) && /json/.test(response.headers('Content-Type'))) {
            response.data = recase.camelCopy(response.data);
            if (response.data.error) {
              //throw new Error(response.data.error.message);
              return $q.reject(new Error(response.data.error.message));
            }
          }
          return response;
        }
      , 'responseError': function (rejection) {
          return rejection;
        }

      };
    }]);

}]).run([ '$rootScope', 'StSession', 'LdsAccount', 'StApi', function ($rootScope, StSession, LdsAccount, StApi) {
  $rootScope.R = {};

  if (/local|:\d+/.test(StApi.apiPrefix)) {
    $rootScope.R.dev = true;
  }
  // attach after angular is initialized so that angular errors
  // don't annoy developers that forgot bower install
  window.addEventListener('error', function (err) {
    window.alert('Uncaught Exception: ' + (err.message || 'unknown error'));
  });

  StSession.use(function (session, opts) {
    return LdsAccount.ensureAccount(session, opts).then(function (session) {
      return session;
    });
  });

  StSession.restoreSession();
}]);

angular.module('yololiumApp')
  .service('mySession', [function () {}])
  .service('StPayInvoice', [function () {}])
  ;
