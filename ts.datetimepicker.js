(function (window, angular, undefined) {

    'use strict';

    angular.module('ts.datetimePicker', ['ts.pointerEventsNone']);
    angular.module('ts.datetimePicker').directive('tsDatetimePicker', DatetimePickerController);

    DatetimePickerController.$inject = ['$parse'];
    function DatetimePickerController ($parse) {
        return {
            restrict: 'E',
            scope: {
                tsDatetimePicker: '='
            },
            templateUrl: 'template/ts.datetimepicker.html',
            link: function ($scope, $element, $attributes) {
                var date = null;
                $scope.tsDatetimePicker = angular.extend({showTime: true, mode: "scroll"}, $scope.tsDatetimePicker);

                MINUTES_STEP = $scope.tsDatetimePicker.minute_step ? $scope.tsDatetimePicker.minute_step : MINUTES_STEP;
                FIRST_HOUR   = $scope.tsDatetimePicker.first_hour  ? $scope.tsDatetimePicker.first_hour  : FIRST_HOUR;
                LAST_HOUR    = $scope.tsDatetimePicker.last_hour   ? $scope.tsDatetimePicker.last_hour   : LAST_HOUR;

                var onOutOfRange = $scope.tsDatetimePicker.onOutOfRange;

                $scope.day = {};
                $scope.month = {};
                $scope.year = {};
                $scope.hour = {};
                $scope.minute = {};

                $scope.$watch('tsDatetimePicker.show', function (newValue) {
                    if (newValue) {
                        var newDate = $parse($scope.tsDatetimePicker.date)($scope.tsDatetimePicker.scope);
                        date = (newDate instanceof Date) ? newDate : new Date;
                        $scope.year.value = date.getFullYear();
                        $scope.month.value = date.getMonth();
                        $scope.day.value = date.getDate();
                        $scope.hour.value = date.getHours();
                        $scope.minute.value = date.getMinutes();
                    }
                });

                $scope.onSetClick = function () {
                    if ($scope.tsDatetimePicker.showTime) {
                        var date = new Date($scope.year.value, $scope.month.value, $scope.day.value, $scope.hour.value, $scope.minute.value);
                    } else {
                        var date = new Date($scope.year.value, $scope.month.value, $scope.day.value);
                    }

                    if($scope.tsDatetimePicker.showTime
                        && ($scope.hour.value < FIRST_HOUR
                        || ($scope.hour.value > (LAST_HOUR - 1) && $scope.minute.value > 0))){
                        if(onOutOfRange){
                            onOutOfRange(FIRST_HOUR, LAST_HOUR);
                        } else {
                            alert('Hour out of accepted range. Accepted range : ' + FIRST_HOUR + ':00 - ' + LAST_HOUR + ':00');
                        }
                    } else {
                        $parse($scope.tsDatetimePicker.date).assign($scope.tsDatetimePicker.scope, date);
                        $scope.tsDatetimePicker.show = false;
                    }
                };

                $scope.onCancelClick = function () {
                    $scope.day.value = date.getDate();
                    $scope.month.value = date.getMonth();
                    $scope.year.value = date.getFullYear();
                    $scope.hour.value = date.getHours();
                    $scope.minute.value = date.getMinutes();
                    $scope.tsDatetimePicker.show = false;
                };
            }
        };
    }

    /**
     * DateScroll & TimeScroll Directives
     */
    var HEIGHT = 40;
    var minYear = 2000;
    var maxYear = 2020;
    var MINUTES_STEP = 5;
    var FIRST_HOUR = 0;
    var LAST_HOUR = 23;

    var range = function (start, end, step) {
        var array = [];
        for (; start <= end; array.push(start), start += step || 1);
        return array;
    };

    var getCoordinateByValue = function ($element, value, step) {
        step || (step = 1);
        var rest = value % step;
        value += rest === 0 ? 0 : step - rest;
        return HEIGHT - $element.find('[data-value="' + value + '"]').index() * HEIGHT;
    };

    var animate = function ($element, coordinate, timeout) {
        $element.css({
            'transition': '-webkit-transform ' + (timeout || 0) + 's ease-out',
            '-webkit-transition': '-webkit-transform ' + (timeout || 0) + 's ease-out'
        });
        $element.css({
            'transform': 'translate3d(0px, ' + coordinate + 'px, 0px)',
            '-webkit-transform': 'translate3d(0px, ' + coordinate + 'px, 0px)',
            '-moz-transform': 'translate3d(0px, ' + coordinate + 'px, 0px)'
        });
    };

    var getCoordinateY = function (event) {
        var touches = event.touches && event.touches.length ? event.touches : [event];
        var e = (event.changedTouches && event.changedTouches[0]) ||
            (event.originalEvent && event.originalEvent.changedTouches &&
            event.originalEvent.changedTouches[0]) ||
            touches[0].originalEvent || touches[0];

        return e.clientY;
    };

    var bindEvents = function ($scope, fieldName, step, min, max) {
        var active = false;
        var currentY = null;
        var currentCoordinate = null;
        var field = $scope[fieldName];
        var timestamp = null;
        var lastPositiveDeltaY = null;
        field.$element.on('click', 'div', function (e) {
            var value = parseInt($(this).data('value'));
            var coordinate = getCoordinateByValue(field.$element, value, step);
            animate(field.$element, coordinate, Math.abs(field.value - value) * 0.1);
            field.value = value;
            $scope.$apply();
        });
        field.$element.on('mousedown touchstart', function (e) {
            active = true;
            currentY = getCoordinateY(e);
            currentCoordinate = getCoordinateByValue(field.$element, field.value, step);
        });
        field.$element.on('mousemove touchmove', function (e) {
            if (active) {
                var y = getCoordinateY(e);
                lastPositiveDeltaY = (currentY - y) || lastPositiveDeltaY;
                var newCoordinate = currentCoordinate - lastPositiveDeltaY;
                if (newCoordinate <= (3 * HEIGHT - 1) && newCoordinate >= -HEIGHT - (field.values.length - 1) * HEIGHT + 1) {
                    currentCoordinate = newCoordinate;
                    animate(field.$element, newCoordinate);
                    timestamp = Date.now()
                }
                currentY = y;
            }
        });
        field.$element.on('mouseup touchend mouseleave touchcancel', function (e) {
            if (active) {
                active = false;
                lastPositiveDeltaY = (currentY - getCoordinateY(e)) || lastPositiveDeltaY;
                var xFrames = Math.floor(lastPositiveDeltaY / (Date.now() - timestamp)) || 0;
                var newCoordinate = Math.round(currentCoordinate / HEIGHT - xFrames) * HEIGHT;
                if (newCoordinate > HEIGHT) {
                    newCoordinate = HEIGHT;
                } else if (newCoordinate < HEIGHT - (field.values.length - 1) * HEIGHT) {
                    newCoordinate = HEIGHT - (field.values.length - 1) * HEIGHT;
                }
                field.value = field.values[1 - newCoordinate / HEIGHT];
                animate(field.$element, newCoordinate, Math.abs(newCoordinate - currentCoordinate) / HEIGHT * 0.1);

                //field.value = field.values[1 - newCoordinate / HEIGHT];
                $scope.$apply();
                currentY = currentCoordinate = lastPositiveDeltaY = null
            }
        });
    };

    angular.module('ts.datetimePicker').directive("dateScroll", DateScrollDirective);

    function DateScrollDirective() {

        var daysInMonth = function (year, month) {
            return (new Date(year, month + 1, 0)).getDate();
        };

        var directive = {
            bindToController: false,
            controller: DirectiveController,
            replace: true,
            restrict: 'E',
            scope: false,
            templateUrl: 'template/ts.datescroll.html'
        };

        return directive;

        DirectiveController.$inject = ['$scope', '$element', '$timeout'];
        function DirectiveController($scope, $element, $timeout) {
            $scope.day.values = [];
            $scope.day.$element = $element.find('.dp-column-day .dp-ul');

            $scope.month.values = range(0, 11);
            $scope.month.$element = $element.find('.dp-column-month .dp-ul');

            $scope.year.values = range(minYear, maxYear);
            $scope.year.$element = $element.find('.dp-column-year .dp-ul');

            $scope.$watch('tsDatetimePicker.show', function (newValue) {
                if (newValue) {
                    $timeout(function (){
                        animate($scope.year.$element, getCoordinateByValue($scope.year.$element, $scope.year.value));
                        animate($scope.month.$element, getCoordinateByValue($scope.month.$element, $scope.month.value));
                        animate($scope.day.$element, getCoordinateByValue($scope.day.$element, $scope.day.value));
                    });
                } else {
                    animate($scope.year.$element, getCoordinateByValue($scope.year.$element, $scope.year.value));
                    animate($scope.month.$element, getCoordinateByValue($scope.month.$element, $scope.month.value));
                    animate($scope.day.$element, getCoordinateByValue($scope.day.$element, $scope.day.value));
                }
            });

            $scope.$watch('daysInMonth', function (newValue, oldValue) {
                $scope.day.values = range(1, newValue);
                if (newValue < $scope.day.value) {
                    $scope.day.value = newValue;
                    animate($scope.day.$element, getCoordinateByValue($scope.day.$element, newValue), Math.abs(newValue - oldValue) * 0.1);
                }
            });

            $scope.$watch('year.value', function (newValue, oldValue) {
                $scope.daysInMonth = daysInMonth(newValue, $scope.month.value);
            });
            $scope.$watch('month.value', function (newValue, oldValue) {
                $scope.daysInMonth = daysInMonth($scope.year.value, newValue);
            });

            bindEvents($scope, 'year');
            bindEvents($scope, 'month');
            bindEvents($scope, 'day');
        }
    }

    angular.module('ts.datetimePicker').directive("timeScroll", TimeScrollDirective);

    function TimeScrollDirective() {

        var directive = {
            bindToController: false,
            controller: DirectiveController,
            replace: true,
            restrict: 'E',
            scope: false,
            templateUrl: 'template/ts.timescroll.html'
        };

        return directive;

        DirectiveController.$inject = ['$scope', '$element', '$timeout'];
        function DirectiveController($scope, $element, $timeout) {
            $scope.hour.values = range(0, 23);
            $scope.hour.$element = $element.find('.dp-column-hour .dp-ul');

            $scope.minute.values = range(0, 59);
            $scope.minute.$element = $element.find('.dp-column-minute .dp-ul');

            $scope.$watch('tsDatetimePicker.show', function (newValue) {
                if (newValue) {
                    $timeout(function (){
                        animate($scope.hour.$element, getCoordinateByValue($scope.hour.$element, $scope.hour.value));
                        animate($scope.minute.$element, getCoordinateByValue($scope.minute.$element, $scope.minute.value));
                    });
                } else {
                    animate($scope.hour.$element, getCoordinateByValue($scope.hour.$element, $scope.hour.value));
                    animate($scope.minute.$element, getCoordinateByValue($scope.minute.$element, $scope.minute.value));
                }
            });

            bindEvents($scope, 'hour', 0 , FIRST_HOUR, LAST_HOUR);
            bindEvents($scope, 'minute', MINUTES_STEP);
        }
    }

    /**
     * DatePicker & TimePicker Directives
     */
    angular.module('ts.datetimePicker').directive("datePicker", [DatePickerDirective]);

    function DatePickerDirective() {

        var directive = {
            bindToController: false,
            controller: ['$scope', '$element', DirectiveController],
            replace: true,
            restrict: 'E',
            scope: false,
            template: '<div class="datepicker"></div>'
        };

        return directive;

        function DirectiveController($scope, $element) {
            var datePicker = new DatePicker($element[0], {
                onDateChanged: function (date) {
                    $scope.day.value = date.getDate();
                    $scope.month.value = date.getMonth();
                    $scope.year.value = date.getFullYear();
                }
            });
            $scope.$watch('tsDatetimePicker.show', function (newValue) {
                var date = new Date();

                datePicker.setSelectedDate(new Date(
                    $scope.year ? $scope.year.value : date.getYear(),
                    $scope.month ? $scope.month.value : date.getMonth(),
                    $scope.day ? $scope.day.value : date.getDay()
                ));
            });
            $scope.$on('$destroy', function() {
                datePicker.destroy();
            });
        }
    }

    angular.module('ts.datetimePicker').directive("timePicker", [TimePickerDirective]);

    function TimePickerDirective() {
        var directive = {
            bindToController: false,
            controller: DirectiveController,
            replace: true,
            restrict: 'E',
            scope: false,
            templateUrl: 'template/ts.timepicker.html'
        };

        var bindScroll = function(elementName, $scope){
            if($scope[elementName].element && $scope[elementName].values){
                $scope[elementName].element.bind("DOMMouseScroll mousewheel onmousewheel", function(event){
                    event.preventDefault();
                    event.stopPropagation();

                    var delta = Math.max(-1, Math.min(1, (event.originalEvent.deltaY || -event.originalEvent.deltaY)));

                    var index = $scope[elementName].values.indexOf($scope[elementName].value);

                    if(delta < 0){
                        if($scope[elementName].values[index -1]){
                            $scope[elementName].value = $scope[elementName].values[index -1];
                        }
                    } else if (delta > 0){
                        if($scope[elementName].values[index +1]){
                            $scope[elementName].value = $scope[elementName].values[index +1];
                        }
                    }

                    $scope.$apply();
                });
                return true;
            } else {
                return false;
            }
        };

        return directive;

        DirectiveController.$inject = ['$scope', '$element', '$timeout'];
            function DirectiveController($scope, $element, $timeout) {

            $scope.hour.values = [];
            range(FIRST_HOUR, LAST_HOUR - 1).forEach(function(element) {
                $scope.hour.values.push((element < 10)? '0' + element : element);
            });
            $scope.hour.template_values = $scope.hour.values.slice();
            $scope.hour.element = $element.find(".dp-timepicker-hour");
            bindScroll('hour', $scope);

            $scope.minute.values = [];
            range(0, 59, MINUTES_STEP).forEach(function(element) {
                $scope.minute.values.push((element < 10) ? '0' + element : element);
            });
            $scope.minute.template_values = $scope.minute.values.slice();
            $scope.minute.element = $element.find(".dp-timepicker-minute");
            bindScroll('minute', $scope);

            $scope.$watch('tsDatetimePicker.show', function (newValue) {
                if (newValue && !$scope.hour.value) {
                    var rest = $scope.minute.value % MINUTES_STEP;
                    $scope.minute.value += rest === 0 ? 0 : MINUTES_STEP - rest;
                }

                $scope.hour.value = (($scope.hour.value !== undefined) && ($scope.hour.value < 10) && ($scope.hour.value.toString().length == 1)) ? '0' + $scope.hour.value : $scope.hour.value;
                $scope.minute.value = (($scope.minute.value !== undefined) && ($scope.minute.value < 10) && ($scope.minute.value.toString().length == 1)) ? '0' + $scope.minute.value : $scope.minute.value;

                $scope.minute.values = $scope.minute.template_values.slice();
                $scope.hour.values   = $scope.hour.template_values.slice();

                //hide minutes with values not in range
                if($scope.minute.values.indexOf($scope.minute.value) == -1){
                    var insert_at_index = 0;

                    $scope.minute.values.forEach(function(min_val, index){
                        if(parseInt($scope.minute.value) > parseInt(min_val) && (!$scope.minute.values[index+1] || (parseInt($scope.minute.value) < $scope.minute.values[index+1]))){
                            insert_at_index = index+1;
                        }
                    });

                    if(insert_at_index !== null){
                        $scope.minute.values.splice(insert_at_index, 0, $scope.minute.value);
                        $timeout(function(){
                            $scope.minute.element.find('option[value='+$scope.minute.value+']')[0].style.display = 'none';
                        });
                    }
                }

                //hide hours with values not in range
                if($scope.hour.values.indexOf($scope.hour.value) == -1){
                    var insert_at_index = 0;

                    $scope.hour.values.forEach(function(min_val, index){
                        if(parseInt($scope.hour.value) > parseInt(min_val) && (!$scope.hour.values[index+1] || (parseInt($scope.hour.value) < $scope.hour.values[index+1]))){
                            insert_at_index = index+1;
                        }
                    });

                    if(insert_at_index !== null){
                        $scope.hour.values.splice(insert_at_index, 0, $scope.hour.value);
                        $timeout(function(){
                            $scope.hour.element.find('option[value='+$scope.hour.value+']')[0].style.display = 'none';
                        });
                    }
                }
            });
        }
    }

})(window, window.angular);