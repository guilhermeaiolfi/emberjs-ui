var localization = {
    pt_br: {
        today: 'Hoje',
        dayNames: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
        monthNames: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    },
    en: {
        today: 'Today',
        dayNames: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
        monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    }
};
var UI = UI || {};
UI.CalendarView = Ember.ContainerView.extend({
    classNames: ['calendar-view'],
    childViews: ['controls', 'current', 'daysWeek', 'days'],
    localization: 'pt_br',
    updateValueOnNav: false,
    daysWeekArray: null,
    monthViewing: null,
    yearViewing: null,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    day: new Date().getDate(),

    controls: Ember.ContainerView.extend({
        classNames: ['calendar-controls'],
        childViews: ['yearPrevBtn', 'monthPrevBtn', 'today', 'monthNextBtn', 'yearNextBtn'],
        yearPrevBtn: Ember.View.extend({
            classNames: ['year-prev-btn'],
            tagName: 'a',
            template: Ember.Handlebars.compile("<<"),
            click: function()
            {
                var calendar = this.getPath("parentView.parentView");
                calendar.update(calendar.get('yearViewing') - 1, calendar.get('monthViewing'), calendar.get('day'));            
            }
        }),
        monthPrevBtn: Ember.View.extend({
            classNames: ['month-prev-btn'],
            tagName: 'a',
            template: Ember.Handlebars.compile("<"),
            click: function()
            {
                var calendar = this.getPath("parentView.parentView");
                var month = calendar.get('monthViewing') - 1;
                var year = calendar.get('yearViewing');
                var day = calendar.daysInMonth(year, month);
                if (calendar.get('day') < day)
                {
                    day = calendar.get('day');
                }
                if (month === 0)
                {
                    month = 12;
                    year -= 1;
                }
                calendar.update(year, month, day);
            }
        }),
        monthNextBtn: Ember.View.extend({
            classNames: ['month-next-btn'],
            template: Ember.Handlebars.compile(">"),
            tagName: 'a',
            href: '#',
            click: function()
            {
                var calendar = this.getPath("parentView.parentView");
                var year = calendar.get('yearViewing');
                var month = calendar.get('monthViewing') + 1;
                var day = calendar.daysInMonth(year, month);
                if (calendar.get('day') < day)
                {
                   day = calendar.get('day');
                }
                if (month === 13)
                {
                    month = 1;
                    year += 1;
                }
                calendar.update(year, month, day);
            }
        }),
        yearNextBtn: Ember.View.extend({
            classNames: ['month-next-btn'],
            template: Ember.Handlebars.compile(">>"),
            tagName: 'a',
            click: function() {
                var calendar = this.getPath("parentView.parentView");
                calendar.update(calendar.get('yearViewing')+1, calendar.get('monthViewing'), calendar.get('day'));
            }
        }),
        today: Ember.View.extend({
            classNames: ['today'],
            tagName: 'a',
            template: function(context) {
                return localization[context.getPath('parentView.parentView.localization')].today;
            },
            click: function() {
                var calendar = this.getPath("parentView.parentView");
                var month = new Date().getMonth() + 1;
                var year = new Date().getFullYear();
                var day = new Date().getDate();
                calendar.set("month", month);
                calendar.set("year", year);
                calendar.set("day", day);
                calendar.update(year, month, day);
            }
        })
    }),
    value: Ember.computed(function(property, value) {
        var month = this.get('month');
        month = month > 10? month : "0" + month;
        if (value !== undefined)
        {
            value = value.split("-");
            this.set('year', value[0]);
            this.set('month', value[1]);
            this.set('day', value[2]);
            this.update(this.get('year'), this.get('month'), this.get('day'));
        }
        return this.get('year') + "-" + month + "-" + this.get('day');
    }).property('month', 'year', 'day'),
    
    current: Ember.View.extend({
        classNames: ['current'],
        monthName: Ember.computed(function() {
            return localization[this.getPath('parentView.localization')].monthNames[this.getPath('parentView.monthViewing') - 1];
        }).property('parentView.monthViewing'),
        template: Ember.Handlebars.compile("{{monthName}}&#160;{{parentView.yearViewing}}")
    }),
    
    daysWeek: Ember.CollectionView.extend({
        classNames: ['days-week'],
        contentBinding: "parentView.daysWeekArray",
        itemViewClass: Ember.View.extend({
            template: Ember.Handlebars.compile("{{content}}"),
            tagName: "span"
        })        
    }),
    days: Ember.CollectionView.extend({
        classNames: ['days'],
        content: Ember.A(),
        setStart: function (offset) {
            for(var i = 0 ; i < 6; i++)
            {
                var obj = this.get('childViews').objectAt(i);
                if (i < offset && offset != 7) obj.set('isVisible', true);
                else obj.set('isVisible', false);        
            }
        },
        setNumberOfDays: function(days) {
            for (i = 29; i <= 31; i++)
            {
                if (i <= days)
                {
                    this.get('childViews').objectAt(5 + i).set('isVisible', true);
                }
                else
                    this.get('childViews').objectAt(5 + i).set('isVisible', false);
            }
        },
        init: function() {
            this._super();
            for (var i = 0; i < 6; i++)
            {
                this.content.pushObject({ day: "", notDay: true, isVisible: false });
            }
            for (var i = 0; i < 31; i++)
            {
                this.content.pushObject({ day: i + 1, isVisible: true });
            }
        },
        itemViewClass: Ember.View.extend({
            template: Ember.Handlebars.compile("{{content.day}}"),
            tagName: 'span',
            classNameBindings: ['notDay', 'selected'],
            notDayBinding: "content.notDay",
            selectedBinding: "content.selected",
            mouseEnter: function(e) {
                if (!$(e.target).hasClass('not-day'))
                    $(e.target).addClass('day-over');
            },
            mouseLeave: function(e) {
                $(e.target).removeClass('day-over');
            },
            click: function(e) {
                var calendar = this.getPath('parentView.parentView');
                var content = this.get('content');
                calendar.set('day', content.day);
                calendar.set('month', calendar.get('monthViewing'));
                calendar.set('year', calendar.get('yearViewing'));
                calendar.updateSelected(content.day);
            }
        })
        
    }),

    init: function() {
        this.set('daysWeekArray', localization[this.get('localization')].dayNames);       
        this._super();
        this.set('value', this.get('value'));
    },

    updateSelected: function(day_selected) {
        var collection = this.get("days");
        //var day_selected = this.get('day');
        var daysArray = collection.get('childViews');
        for (var i = 0; i < daysArray.length; i++) {
            var day = daysArray[i];
            if (day.getPath('content.day') == day_selected) {
                day.setPath('content.selected', true);
            }
            else {
                day.setPath('content.selected', false);
            }
        }   
    },

    update: function(year, month, day) {
        var days = this.daysInMonth(year, month);
        var empties = this.firstDayOfMonth(year, month);

        this.get('days').setStart(empties);
        this.get('days').setNumberOfDays(days);

        if (this.get('updateValueOnNav')) {
            this.set('year', day);
            this.set('month', month);    
            this.set('year', year);
        }
        this.set('monthViewing', parseInt(month));
        this.set('yearViewing', parseInt(year));
        
        this.updateSelected(day);
    },
    daysInMonth: function(year, month) {
        return 32 - new Date(year, month - 1, 32).getDate();
    },
    firstDayOfMonth: function (year, month) {
        var day;
        day = new Date(year, month - 1, 0).getDay();
        return day + 1;
    }
});