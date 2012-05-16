var UI = UI || {};
UI.SliderView = Ember.ContainerView.extend ({
  classNames: ['ember-slider'],
  childViews: ['bar', 'knob'],
  value: 0,
  orientation: 'horizontal',
  valueMax: 100,
  valueMin: 0,
  step: 1,

    didInsertElement: function()
    {
      this.$().addClass("ember-slider-" + this.get("orientation"));
      this.knob.updatePosition(this.knob, "parentView.value", this.get("value"));
      this.bar.updatePosition(this.knob, "parentView.value", this.get("value"));
    },
    bar: Ember.View.extend({
        classNames: ["ember-slider-bar"],
        didInsertElement: function()
        {
            var slider = this.get("parentView");
            if (slider.get('orientation') === "horizontal") {
                this.$().css("left", 0);
            }
            else {
                this.$().css("bottom", 0);
            }                
    
        },
        updatePosition: Ember.observer(function(view, property, value) {
          if (value !== undefined)
          {
              var slider = this.get("parentView");
              var horizontal = slider.get("orientation") === "horizontal";
              var size = 0, pos = 0, ratio = 1;
              if (horizontal) {
                  size = slider.$().width();
                  ratio = size / slider.get('valueMax');
                  pos = Math.ceil(value * ratio);
              }
              else {
                  size = slider.$().height();
                  ratio = size / slider.get('valueMax');
                  pos = Math.ceil(value * ratio);
              }
            
              if (size > 0) {
                  this.$().css(horizontal? "width" : "height", pos);
              }
          }
        }, 'parentView.value')
    }),
  normalizeValue: function(val) {

    var step = this.get('step');
    var max = this.get('valueMax');
    var min = this.get('valueMin');
    if (val <= min) {
      return min;
    }
    if (val >= max) {
      return max;
    }

    var valModStep = (val - min) % step,
      alignValue = val - valModStep;

    if (Math.abs(valModStep) * 2 >= step) {
      alignValue += ( valModStep > 0 ) ? step : ( -step );
    }
    // Since JavaScript has problems with large floats, round
    // the final value to 5 digits after the decimal point (see #4124)
    return parseFloat(alignValue.toFixed(5));
  },

  convertPositionToValue: function(x, y) {
    var pixelTotal,
      pixelMouse,
      percentMouse,
      valueTotal,
      valueMouse;
    
    var offset = this.$().offset();

    if (this.orientation === "horizontal") {
      pixelTotal = this.$().outerWidth();
      pixelMouse = x - offset.left - ( this._clickOffset ? this._clickOffset.left : 0 );
    } else {
      pixelTotal = this.$().outerHeight();
      pixelMouse = y - offset.top - ( this._clickOffset ? this._clickOffset.top : 0 );
    }

    percentMouse = ( pixelMouse / pixelTotal );
    if ( percentMouse > 1 ) {
      percentMouse = 1;
    }
    if ( percentMouse < 0 ) {
      percentMouse = 0;
    }
    if ( this.get('orientation') === "vertical" ) {
      percentMouse = 1 - percentMouse;
    }

    valueTotal = this.get('valueMax') - this.get('valueMin');
    valueMouse = this.get('valueMin') + percentMouse * valueTotal;

    return this.normalizeValue(valueMouse);
  },
  knob: App.MouseView.extend({
    classNames: ['ember-slider-knob'],
      tagName: 'a', 
    updatePosition: Ember.observer(function(view, property, value) {
      if (value !== undefined)
      {
          var slider = this.get("parentView");
          var horizontal = slider.get("orientation") === "horizontal";
          var size = 0, pos = 0, ratio = 1;
          if (horizontal) {
              size = slider.$().width();
              ratio = size / slider.get('valueMax');
              pos = Math.ceil(value * ratio);
          }
          else {
              size = slider.$().height();
              ratio = size / slider.get('valueMax');
              pos = size - Math.ceil(value * ratio);
          }
        
          if (size > 0) {
              this.$().css(horizontal? "left" : "top", pos);
          }
      }
    }, 'parentView.value'),
    didInsertElement: function()
    {
    },
    dragStart: function(event)
    {
      var slider = this.get("parentView");
      slider._clickOffset = { left: 0, top: 0 };
        this.$().addClass("ember-state-active");
      return true;
    },
    drag: function(event)
    {
      var slider = this.get('parentView');
      var value = slider.convertPositionToValue(event.clientX, event.clientY);
      slider.set('value', value);
    },
    dragEnd: function(event)
    {
      this.$().removeClass("ember-state-active");
      return true;
    }
  })
});
​