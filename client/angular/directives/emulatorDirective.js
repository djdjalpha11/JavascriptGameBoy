app.directive("emulator", function(){
    return {
        restrict: 'EA',
        templateUrl: "client/angular/views/EmulatorView.html",
        transclude: true,
        scope: {
            height: '=',
            width: '=',
            id: '='
        },
        //controller: "emulatorCtrl",
        link: function(scope, element, attribute){
            
        }
    }
});