var UI = UI || {};

UI.SpinnerView = Ember.ContainerView.extend({
  classNames: ['ember-spinner'],
  childViews: ['input', 'buttons'],
  value: 0,
  step: 1,
  minValue: 0,
  maxValue: 100,
  input: Ember.TextField.extend({
    classNames: ['ember-spinner-input'],
    valueBinding: "parentView.value",
    keyDown: function(evt) {
      console.log("key down");
      var spinner = this.get("parentView");
      
      if (evt.keyCode === 38) { //up
        spinner.stepUp();
      }
      if (evt.keyCode === 40) { //down
        spinner.stepDown();
      }
    },
    keyUp: function() {
      
    }
  }),
  didInsertElement: function()
  {

    var width = this.$().width();
    this.buttons.$().width();
    this.input.$().css("width", width - this.buttons.$().outerWidth() - 2);
  },

  _onInterval : function() {
    var value = this.get('value');
    
    
    if (this._direction === "up") this.stepUp();
    else this.stepDown();
    this._count++;
    
    if (value >= this.get('maxValue') || value <= this.get('minValue')) { this._stopInterval(); return; }
    if (this._count > 4) this._startInterval(this._direction, 100);
  },

  _startInterval: function(direction, delay) {
    var func = $.proxy(this._onInterval, this);
    if (delay !== undefined) {
      this._stopInterval();
    }
    else {
      delay = 500;
    }
    this._count = 0;

    this._interval = window.setInterval(func, delay);
    this._direction = direction;
    this._onInterval();
  },

  _stopInterval: function() {
    window.clearInterval(this._interval);
    this._interval = null;
  },

  stepUp: function() {
    var value = this.get('value');
    if (value < this.get('maxValue')) {
      this.set('value', parseInt(value) + this.get('step'));
    }
  },
  stepDown: function() {
    var value = this.get('value');
    if (value > this.get('minValue')) {
      this.set('value', parseInt(value) - this.get('step'));
    }
  },

  buttons: Ember.ContainerView.extend({
    classNames: 'ember-spinner-buttons',
    childViews: ['up', 'down'],
    up: Ember.View.extend({
      classNames: ['ember-spinner-up-btn'],
      tagName: 'a',
      template: Ember.Handlebars.compile("▲"),
      mouseDown: function() {
        var spinner = this.getPath('parentView.parentView');
        spinner._startInterval("up");
      },
      mouseUp: function() {
        var spinner = this.getPath('parentView.parentView');
        spinner._stopInterval("up");
      }
    }),
    down: Ember.View.extend({
      classNames: ['ember-spinner-down-btn'],
      template: Ember.Handlebars.compile("▼"),
      tagName: 'a',
      mouseDown: function() {
        var spinner = this.getPath('parentView.parentView');
        spinner._startInterval("down");
      },
      mouseUp: function() {
        var spinner = this.getPath('parentView.parentView');
        spinner._stopInterval("down");
      }
    })
  })
});