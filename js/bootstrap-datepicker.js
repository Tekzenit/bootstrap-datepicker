/* =========================================================
 * bootstrap-datepicker.js
 * Repo: https://github.com/eternicode/bootstrap-datepicker/
 * Demo: http://eternicode.github.io/bootstrap-datepicker/
 * Docs: http://bootstrap-datepicker.readthedocs.org/
 * Forked from http://www.eyecon.ro/bootstrap-datepicker
 * =========================================================
 * Started by Stefan Petre; improvements by Andrew Rowls + contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================= */

(function($, undefined){

    function UTCDate(){
        return new Date(Date.UTC.apply(Date, arguments));
    }
    function UTCToday(){
        var today = new Date();
        return UTCDate(today.getFullYear(), today.getMonth(), today.getDate());
    }
    function isUTCEquals(date1, date2){
        return (date1.getUTCFullYear() === date2.getUTCFullYear() &&
                    date1.getUTCMonth() === date2.getUTCMonth() &&
                    date1.getUTCDate() === date2.getUTCDate());
    }
    function alias(method){
        return function(){
            return this[method].apply(this, arguments);
        };
    }
    // Picker object

    var Datepicker = function(element, options){
        this._process_options(options);

        this.date = this.o.defaultViewDate;
        this.viewDate = this.o.defaultViewDate;
        this.focusDate = null;

        this.element = $(element);

        this.picker = $(DPGlobal.template);
        this._buildEvents();
        this._attachEvents();

        this.picker.addClass('datepicker-inline').appendTo(this.element);

        this._allow_update = false;

        this.setStartDate(this.o.defaultViewDate);
        this.setEndDate(this._o.endDate);
        this.setDatesDisabled(this.o.datesdisabled);

        this.fillDow();
        this._allow_update = true;

        this.update();
        this.show();
    };

    Datepicker.prototype = {
        constructor: Datepicker,

        _process_options: function(opts){
            // Store raw options for reference
            this._o = $.extend({}, this._o, opts);
            // Processed options
            var o = this.o = $.extend({}, this._o);

            // Check if "de-DE" style date is available, if not language should
            // fallback to 2 letter code eg "de"
            var lang = o.language;
            o.language = lang;

            o.startView = 0;

            o.weekStart %= 7;
            o.weekEnd = ((o.weekStart + 6) % 7);

            var format = DPGlobal.parseFormat(o.format);

            o.datesDisabled = o.datesDisabled||[];
            if (!$.isArray(o.datesDisabled)) {
              var datesDisabled = [];
              datesDisabled.push(DPGlobal.parseDate(o.datesDisabled, format, o.language));
              o.datesDisabled = datesDisabled;
            }
            o.datesDisabled = $.map(o.datesDisabled,function(d){
              return DPGlobal.parseDate(d, format, o.language);
            });

            o.defaultViewDate = UTCToday();
            o.showOnFocus = o.showOnFocus !== undefined ? o.showOnFocus : true;
        },
        _events: [],
        _secondaryEvents: [],
        _applyEvents: function(evs){
            for (var i = 0, el, ch, ev; i < evs.length; i++){
                el = evs[i][0];
                if(evs[i].length === 2){
                    ch = undefined;
                    ev = evs[i][1];
                } else if(evs[i].length === 3){
                    ch = evs[i][1];
                    ev = evs[i][2];
                }
                el.on(ev, ch);
            }
        },
        _unapplyEvents: function(evs){
            for (var i = 0, el, ev, ch; i < evs.length; i++){
                el = evs[i][0];
                if(evs[i].length === 2){
                    ch = undefined;
                    ev = evs[i][1];
                } else if(evs[i].length === 3){
                    ch = evs[i][1];
                    ev = evs[i][2];
                }
                el.off(ev, ch);
            }
        },
        _buildEvents: function(){
            var events = {
                keyup: $.proxy(function (e){
                    if($.inArray(e.keyCode, [27, 37, 39, 38, 40, 32, 13, 9]) === -1){
                        this.update();
                    }
                }, this),
                keydown: $.proxy(this.keydown, this)
            };

            if(this.o.showOnFocus === true)
                events.focus = $.proxy(this.show, this);

            this._events = [
                [this.element, events]
            ];
            this._events.push(
                // Component: listen for blur on element descendants
                [this.element, '*', {
                    blur: $.proxy(function(e){
                        this._focused_from = e.target;
                    }, this)
                }],
                // Input: listen for blur on element
                [this.element, {
                    blur: $.proxy(function(e){
                        this._focused_from = e.target;
                    }, this)
                }]
            );

            this._secondaryEvents = [
                [this.picker, {
                    click: $.proxy(this.click, this)
                }],
                [$(window), {
                    resize: $.proxy(this.place, this)
                }]
           ];
        },
        _attachEvents: function(){
            this._detachEvents();
            this._applyEvents(this._events);
        },
        _detachEvents: function(){
            this._unapplyEvents(this._events);
        },
        _attachSecondaryEvents: function(){
            this._detachSecondaryEvents();
            this._applyEvents(this._secondaryEvents);
        },
        _detachSecondaryEvents: function(){
            this._unapplyEvents(this._secondaryEvents);
        },
        _trigger: function(event, altdate){
            var date = altdate || this.date,
                local_date = this._utc_to_local(date);

            this.element.trigger({
                type: event,
                date: local_date,
                format: $.proxy(function(ix, format){
                    format = this.o.format;
                    var date = this.date;
                    return DPGlobal.formatDate(date, format, this.o.language);
                }, this)
            });
        },

        show: function(){
            if(this.element.attr('readonly'))
                return;
            this.picker.show();
            this._attachSecondaryEvents();
            this._trigger('show');
            if((window.navigator.msMaxTouchPoints || 'ontouchstart' in document) && this.o.disableTouchKeyboard)
                $(this.element).blur();
            return this;
        },

        _utc_to_local: function(utc){
            return utc && new Date(utc.getTime() + (utc.getTimezoneOffset() * 60000));
        },
        _local_to_utc: function(local){
            return local && new Date(local.getTime() - (local.getTimezoneOffset() * 60000));
        },
        _zero_time: function(local){
            return local && new Date(local.getFullYear(), local.getMonth(), local.getDate());
        },
        _zero_utc_time: function(utc){
            return utc && new Date(Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate()));
        },

        setValue: function(){
            var formatted = this.getFormattedDate();
            return this;
        },

        getFormattedDate: function(format){
            format = format || this.o.format;
            return DPGlobal.formatDate(this.date, format, this.o.language);
        },

        setStartDate: function(startDate){
            this._process_options({ startDate: startDate });
            this.update();
            this.updateNavArrows();
            return this;
        },

        setEndDate: function(endDate){
            this._process_options({ endDate: endDate });
            this.update();
            this.updateNavArrows();
            return this;
        },

        setDatesDisabled: function(datesDisabled){
          this._process_options({datesDisabled: datesDisabled});
          this.update();
          this.updateNavArrows();
        },

        _allow_update: true,
        update: function(){
            if(!this._allow_update)
                return this;

            var oldDate = this.date,
                date = null,
                fromArgs = false;
            if(arguments.length){
                date = this._local_to_utc(date);
                fromArgs = true;
            }
            else {
                date = this.element.data('date');
                delete this.element.data().date;
            }

            date = DPGlobal.parseDate(date, this.o.format, this.o.language);
            this.date = date;

            if(this.date)
                this.viewDate = new Date(this.date);
            else if(this.viewDate < this.o.startDate)
                this.viewDate = new Date(this.o.startDate);
            else if(this.viewDate > this.o.endDate)
                this.viewDate = new Date(this.o.endDate);

            if(fromArgs){
                // setting date by clicking
                this.setValue();
            }
            else if(date){
                // setting date by typing
                if(String(oldDate) !== String(this.date))
                    this._trigger('changeDate');
            }
            if(!this.date && oldDate)
                this._trigger('clearDate');

            this.fill();
            return this;
        },

        fillDow: function(){
            var dowCnt = this.o.weekStart,
                html = '<tr class="medium">';
            html2 = '';
            while (dowCnt < this.o.weekStart + 7){
                k = (dowCnt++)%7;
                html += '<th class="dow">'+dates[this.o.language].days[k]+'</th>';
                html2 += '<th class="dow">'+dates[this.o.language].daysShort[k]+'</th>';
            }
            html += '</tr>';
            html += '<tr class="small">' + html2 + '</tr>';
            this.picker.find('.datepicker-days thead').append(html);
        },

        getClassNames: function(date){
            var cls = [],
                year = this.viewDate.getUTCFullYear(),
                month = this.viewDate.getUTCMonth(),
                today = new Date();
            if(date.getUTCFullYear() < year || (date.getUTCFullYear() === year && date.getUTCMonth() < month)){
                cls.push('old');
            }
            else if(date.getUTCFullYear() > year || (date.getUTCFullYear() === year && date.getUTCMonth() > month)){
                cls.push('new');
            }
            if(this.focusDate && date.valueOf() === this.focusDate.valueOf())
                cls.push('focused');
            if( isUTCEquals(date, today))
                cls.push('today');
            if(date.getUTCFullYear() === today.getUTCFullYear() && date.getUTCMonth() === today.getUTCMonth() && date.getUTCDate() < today.getUTCDate()){
                cls.push('old');
            }
            // Compare internal UTC date with local today, not UTC today
            if( this.date && isUTCEquals(date, this.date))
                cls.push('active');

            if (this.o.datesDisabled.length > 0 &&
              $.grep(this.o.datesDisabled, function(d){
                return isUTCEquals(date, d); }).length > 0) {
              cls.push('disabled', 'disabled-date');
            }

            return cls;
        },

        fill: function(){
            var d = new Date(this.viewDate),
                year = d.getUTCFullYear(),
                month = d.getUTCMonth(),
                startYear = this.o.startDate !== -Infinity ? this.o.startDate.getUTCFullYear() : -Infinity,
                startMonth = this.o.startDate !== -Infinity ? this.o.startDate.getUTCMonth() : -Infinity,
                endYear = this.o.endDate !== Infinity ? this.o.endDate.getUTCFullYear() : Infinity,
                endMonth = this.o.endDate !== Infinity ? this.o.endDate.getUTCMonth() : Infinity;
            if(isNaN(year) || isNaN(month)) return;
            this.picker.find('.datepicker-days .datepicker-title')
                        .find('.month').text(dates[this.o.language].months[month]);
            this.picker.find('.datepicker-days .datepicker-title')
                        .find('.year').text(year);
            this.updateNavArrows();
            var prevMonth = UTCDate(year, month-1, 28),
                day = DPGlobal.getDaysInMonth(prevMonth.getUTCFullYear(), prevMonth.getUTCMonth());
            prevMonth.setUTCDate(day);
            prevMonth.setUTCDate(day - (prevMonth.getUTCDay() - this.o.weekStart + 7)%7);
            var nextMonth = new Date(prevMonth);
            nextMonth.setUTCDate(nextMonth.getUTCDate() + 42);
            nextMonth = nextMonth.valueOf();
            var html = [];
            var clsName;
            while (prevMonth.valueOf() < nextMonth){
                if(prevMonth.getUTCDay() === this.o.weekStart)
                    html.push('<tr>');

                clsName = this.getClassNames(prevMonth);
                clsName.push('day');

                clsName = $.unique(clsName);
                html.push('<td class="'+clsName.join(' ')+'"' + '>'+prevMonth.getUTCDate() + '</td>');

                if(prevMonth.getUTCDay() === this.o.weekEnd)
                    html.push('</tr>');

                prevMonth.setUTCDate(prevMonth.getUTCDate()+1);
            }
            this.picker.find('.datepicker-days tbody').empty().append(html.join(''));
        },

        updateNavArrows: function(){
            if(!this._allow_update)
                return;

            var d = new Date(this.viewDate),
                year = d.getUTCFullYear(),
                month = d.getUTCMonth();


            if(this.o.startDate !== -Infinity && year <= this.o.startDate.getUTCFullYear() && month <= this.o.startDate.getUTCMonth()){
                this.picker.find('.prev').addClass('disabled');
            }
            else {
                this.picker.find('.prev').removeClass('disabled');
            }

            // this.picker.find('.next').css({visibility: 'visible'});
        },

        click: function(e){
            e.preventDefault();
            var target = $(e.target).closest('li, td'),
                year, month, day;

            if(target.length === 1){
                switch (target[0].nodeName.toLowerCase()){
                    case 'li':
                        switch (target[0].className){
                            case 'prev':
                            case 'next':
                                var dir = (target[0].className === 'prev' ? -1 : 1);
                                this.viewDate = this.moveMonth(this.viewDate, dir);
                                this._trigger('changeMonth', this.viewDate);
                                this.fill();
                                break;
                        }
                        break;
                    case 'td':
                        if(target.is('.day') && !target.is('.disabled') && !target.is('.old') && !target.is('.new')){
                            day = parseInt(target.text(), 10)||1;
                            year = this.viewDate.getUTCFullYear();
                            month = this.viewDate.getUTCMonth();
                            if(target.is('.old')){
                                if(month === 0){
                                    month = 11;
                                    year -= 1;
                                } else {
                                    month -= 1;
                                }
                            } else if(target.is('.new')){
                                if(month === 11){
                                    month = 0;
                                    year += 1;
                                } else {
                                    month += 1;
                                }
                            }
                            this._setDate(UTCDate(year, month, day));
                        }
                        break;
                }
            }
            if(this.picker.is(':visible') && this._focused_from)
                $(this._focused_from).focus();

            delete this._focused_from;
        },

        _setDate: function(date, which){
            this.date = date;

            if(!which || which  === 'view')
                this.viewDate = date && new Date(date);

            this.fill();
            this.setValue();
            if(!which || which  !== 'view')
                this._trigger('changeDate');

            var element;
            if(element)
                element.change();
        },

        moveMonth: function(date, dir){
            if(!date)
                return undefined;
            if(!dir)
                return date;
            var new_date = new Date(date.valueOf()),
                day = new_date.getUTCDate(),
                month = new_date.getUTCMonth(),
                mag = Math.abs(dir),
                new_month, test;
            dir = dir > 0 ? 1 : -1;
            if(mag === 1){
                test = dir === -1
                    // If going back one month, make sure month is not current month
                    // (eg, Mar 31 -> Feb 31 == Feb 28, not Mar 02)
                    ? function(){
                        return new_date.getUTCMonth() === month;
                    }
                    // If going forward one month, make sure month is as expected
                    // (eg, Jan 31 -> Feb 31 == Feb 28, not Mar 02)
                    : function(){
                        return new_date.getUTCMonth() !== new_month;
                    };
                new_month = month + dir;
                new_date.setUTCMonth(new_month);
                // Dec -> Jan (12) or Jan -> Dec (-1) -- limit expected date to 0-11
                if(new_month < 0 || new_month > 11)
                    new_month = (new_month + 12) % 12;
            }
            else {
                // For magnitudes >1, move one month at a time...
                for (var i=0; i < mag; i++)
                    // ...which might decrease the day (eg, Jan 31 to Feb 28, etc)...
                    new_date = this.moveMonth(new_date, dir);
                // ...then reset the day, keeping it in the new month
                new_month = new_date.getUTCMonth();
                new_date.setUTCDate(day);
                test = function(){
                    return new_month !== new_date.getUTCMonth();
                };
            }
            // Common date-resetting loop -- if date is beyond end of month, make it
            // end of month
            while (test()){
                new_date.setUTCDate(--day);
                new_date.setUTCMonth(new_month);
            }
            return new_date;
        },

        dateWithinRange: function(date){
            return date >= this.o.startDate && date <= this.o.endDate;
        },

        keydown: function(e){
            if(this.picker.is(':not(:visible)')){
                if(e.keyCode === 27) // allow escape to hide and re-show picker
                    this.show();
                return;
            }
            var dateChanged = false,
                dir, newDate, newViewDate,
                focusDate = this.focusDate || this.viewDate;
            switch (e.keyCode){
                case 27: // escape
                    if(this.focusDate){
                        this.focusDate = null;
                        this.viewDate = this.date || this.viewDate;
                        this.fill();
                    }

                    e.preventDefault();
                    break;
                case 37: // left
                case 39: // right
                    if(!this.o.keyboardNavigation)
                        break;
                    dir = e.keyCode === 37 ? -1 : 1;
                    newDate = new Date(this.date || UTCToday());
                    newDate.setUTCDate(newDate.getUTCDate() + dir);
                    newViewDate = new Date(focusDate);
                    newViewDate.setUTCDate(focusDate.getUTCDate() + dir);

                    if(this.dateWithinRange(newViewDate)){
                        this.focusDate = this.viewDate = newViewDate;
                        this.setValue();
                        this.fill();
                        e.preventDefault();
                    }
                    break;
                case 38: // up
                case 40: // down
                    if(!this.o.keyboardNavigation)
                        break;
                    dir = e.keyCode === 38 ? -1 : 1;
                    newDate = new Date(this.date || UTCToday());
                    newDate.setUTCDate(newDate.getUTCDate() + dir * 7);
                    newViewDate = new Date(focusDate);
                    newViewDate.setUTCDate(focusDate.getUTCDate() + dir * 7);

                    if(this.dateWithinRange(newViewDate)){
                        this.focusDate = this.viewDate = newViewDate;
                        this.setValue();
                        this.fill();
                        e.preventDefault();
                    }
                    break;
                case 32: // spacebar
                    // Spacebar is used in manually typing dates in some formats.
                    // As such, its behavior should not be hijacked.
                    break;
                case 13: // enter
                    focusDate = this.focusDate || this.date || this.viewDate;
                    if(this.o.keyboardNavigation){
                        this.date = focusDate;
                        dateChanged = true;
                    }
                    this.focusDate = null;
                    this.viewDate = this.date || this.viewDate;
                    this.setValue();
                    this.fill();
                    if(this.picker.is(':visible')){
                        e.preventDefault();
                        if(typeof e.stopPropagation === 'function'){
                            e.stopPropagation(); // All modern browsers, IE9+
                        } else {
                            e.cancelBubble = true; // IE6,7,8 ignore "stopPropagation"
                        }
                    }
                    break;
                case 9: // tab
                    this.focusDate = null;
                    this.viewDate = this.date || this.viewDate;
                    this.fill();
                    break;
            }
            if(dateChanged){
                if(this.date)
                    this._trigger('changeDate');
                else
                    this._trigger('clearDate');
                var element;
                if(element){
                    element.change();
                }
            }
        }
    };

    var old = $.fn.datepicker;
    var datepickerPlugin = function(option){
        var args = Array.apply(null, arguments);
        args.shift();
        this.each(function(){
            var $this = $(this),
                data = $this.data('datepicker'),
                options = typeof option === 'object' && option;
            if(!data){
                var locopts = dates[this.language],
                    // Options priority: js args, data-attrs, locales, defaults
                    opts = $.extend({}, defaults, locopts, options);
                $this.data('datepicker', (data = new Datepicker(this, opts)));
            }
        });
        return this;
    };
    $.fn.datepicker = datepickerPlugin;

    var defaults = $.fn.datepicker.defaults = {
        datesDisabled: [],
        endDate: Infinity,
        forceParse: true,
        format: 'mm/dd/yyyy',
        keyboardNavigation: true,
        language: 'en',
        startDate: -Infinity,
        weekStart: 1,
        disableTouchKeyboard: false,
        container: 'body'
    };
    $.fn.datepicker.Constructor = Datepicker;
    var dates = $.fn.datepicker.dates = {
        en: {
            days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        }
    };

    var DPGlobal = {
        isLeapYear: function(year){
            return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0));
        },
        getDaysInMonth: function(year, month){
            return [31, (DPGlobal.isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
        },
        validParts: /dd?|DD?|mm?|MM?|yy(?:yy)?/g,
        nonpunctuation: /[^ -\/:-@\[\u3400-\u9fff-`{-~\t\n\r]+/g,
        parseFormat: function(format){
            // IE treats \0 as a string end in inputs (truncating the value),
            // so it's a bad format delimiter, anyway
            var separators = format.replace(this.validParts, '\0').split('\0'),
                parts = format.match(this.validParts);
            if(!separators || !separators.length || !parts || parts.length === 0){
                throw new Error("Invalid date format.");
            }
            return {separators: separators, parts: parts};
        },
        parseDate: function(date, format, language){
            if(!date)
                return undefined;
            if(date instanceof Date)
                return date;
            date = UTCDate(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
            return date;
        },
        formatDate: function(date, format, language){
            if(!date)
                return '';
            if(typeof format === 'string')
                format = DPGlobal.parseFormat(format);
            var val = {
                d: date.getUTCDate(),
                D: dates[language].daysShort[date.getUTCDay()],
                DD: dates[language].days[date.getUTCDay()],
                m: date.getUTCMonth() + 1,
                MM: dates[language].months[date.getUTCMonth()],
                yyyy: date.getUTCFullYear()
            };
            val.dd = (val.d < 10 ? '0' : '') + val.d;
            val.mm = (val.m < 10 ? '0' : '') + val.m;
            date = [];
            var seps = $.extend([], format.separators);
            for (var i=0, cnt = format.parts.length; i <= cnt; i++){
                if(seps.length)
                    date.push(seps.shift());
                date.push(val[format.parts[i]]);
            }
            return date.join('');
        },
        headTemplate: '<thead>'+
                        '</thead>'
    };
    DPGlobal.template = '<div class="datepicker">'+
                            '<div class="datepicker-days" tabindex="-1">'+
                                '<ul class="datepicker-header pagination small">'+
                                    '<li class="prev"><a href="#"><i class="icon-outlined-arrow-left"></i></a></li>'+
                                    '<li class="datepicker-title"><span class="month"></span><span class="year"></span></li>'+
                                    '<li class="next"><a href="#"><i class="icon-outlined-arrow-right"></i></a></li>'+
                                '</ul>'+
                                '<table class=" table-condensed">'+
                                    DPGlobal.headTemplate+
                                    '<tbody></tbody>'+
                                '</table>'+
                            '</div>'+
                        '</div>';

    $.fn.datepicker.DPGlobal = DPGlobal;


    /* DATEPICKER NO CONFLICT
    * =================== */

    $.fn.datepicker.noConflict = function(){
        $.fn.datepicker = old;
        return this;
    };

}(window.jQuery));
