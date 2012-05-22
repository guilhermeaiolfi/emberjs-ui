var UI = UI || {};
UI.ColorPickerView = Em.ContainerView.extend({
  classNames: 'ember-colorpicker',
  childViews: [ 'overlay', 'hue', 'selected_color', 'reset_color', 'rgb', 'hsb', 'hex', 'labels'],
  value: 'ff0000',
  ready: false,
  selected_color: Em.View.extend({
    classNames: 'reset_color',
    didInsertElement: Em.observer(function() {
      this.$().css("background-color", '#' + this.getPath('parentView.value'));
    })
  }),

  reset_color: Em.View.extend({
    classNames: 'selected_color',
    didInsertElement: function() {
      this.valueDidChange();
    },
    valueDidChange: Em.observer(function() {
      this.$().css("background-color", '#' + this.getPath('parentView.value'));
    }, 'parentView.value')
  }),
  labels: Em.ContainerView.extend({
    childViews: ['rgb', 'hsb'],
    classNames: 'labels',
    rgb: Em.View.extend({
        classNames: 'labels_rgb',
        template: Em.Handlebars.compile("<label>R</label><label>G</label><label>B</label><label>#</label>")
    }),
    hsb: Em.View.extend({
        classNames: 'labels_hsb',
        template: Em.Handlebars.compile("<label>H</label><label>S</label><label>B</label>")
    })
  }),
  valueDidChange: Ember.observer(function(view, property, value) {
    if (this.get('changing') == true) return;
    if (!this.get('ready')) return;
    this.set('changing', true);
    if (property.indexOf("rgb") != -1) {
      var rgb = this.rgb.get('value');
      var hsb = this.rgbToHsb(rgb);
      var hex = this.rgbToHex(rgb);
      this.hsb.set('value', hsb);
      this.hex.set('value', hex);
    }
    else if (property.indexOf('hsb') != -1) {
      var hsb = this.hsb.get('value');
      var rgb = this.hsbToRgb(hsb);
      var hex = this.rgbToHex(rgb);
      this.rgb.set('value', rgb);
      this.set('value', hex);
    }
    else if (property === "value") {
      var rgb = this.hexToRgb(value);
      var hsb = this.rgbToHsb(rgb);
      this.rgb.set('value', rgb);
      this.hsb.set('value', hsb);
    } 
    else if (property.indexOf('hue') != -1) {
      this.hsb.h.set('value', value);
      var hsb = this.hsb.get('value');
      var rgb = this.hsbToRgb(hsb);
      this.set('value', this.hsbToHex(hsb));
      this.rgb.set('value', rgb);
    } 
    this.set('changing', false);
  }, 'value', 'hue.value','hsb.value', 'rgb.value'),
  didInsertElement: function() 
  {
    this.set('ready', true);
    this.valueDidChange(this, "value", this.get('value'));
  },
  hexToRgb: function(hex) {
    var hex = parseInt(((hex.indexOf('#') > -1) ? hex.substring(1) : hex), 16);
    return {r: hex >> 16, g: (hex & 0x00FF00) >> 8, b: (hex & 0x0000FF)};
  },
  overlay: Em.ContainerView.extend(UI.DragMixin, {
    childViews: ['knob'],
    delay: 100,
    classNames: 'ember-colorpicker-overlay',
    dragStart: function() {
        return true;
    },
    drag: function(evt) {
      var overlay = this.$();;
      var offset = overlay.offset();
      offset.right = offset.left + overlay.width();
      offset.bottom = offset.top + overlay.height();
           
      var top = evt.clientY - offset.top;
      var left = evt.clientX - offset.left;
      if (evt.clientY < offset.top) top = 0;
      if (evt.clientY > offset.bottom) top = overlay.height();
      if (evt.clientX > offset.right) left = overlay.width();
      if (evt.clientX < offset.left) left = 0;

      var colorpicker = this.get('parentView');
      var hsb = {
        h: colorpicker.get('hue').get('value'),
        s: parseInt(100*(left/150), 10),
        b: 100 - parseInt(100*(top/150), 10),
      };
      
      colorpicker.hsb.set('value', hsb);
    },
    knob: Ember.View.extend({
      top: 0, 
      left: 0,
      updatePosition: Ember.observer(function() {
        this.$().css({ top: 150 - this.top, left: this.left });
      }, 'positon')
    })
  }),

  hue: UI.SliderView.extend({
    classNames: "ember-colorpicker-hue",
    orientation: 'vertical',
    minValue: 0,
    maxValue: 360,
    valueDidChange: Ember.observer(function() {
      var hsb = { 
        h: this.get('value'), 
        s: 100,
        b: 100
      };
      var colorpicker = this.get('parentView');
      var rgb = colorpicker.hsbToRgb(hsb);
      var hex = colorpicker.rgbToHex(rgb);
      colorpicker.get('overlay').$().css("background-color", "#" + hex);
    }, 'value')
  }),
  rgb: Em.ContainerView.extend({
    classNames: "ember-colorpicker-rgb",
    valueDidChange: Ember.observer(function(view, property, value) {
      var rgb = this.get('value');
      rgb[property.charAt(0)] = value;
      this.set('value', rgb);
    }, 'r.value', 'g.value', 'b.value'),
    value: Ember.computed(function(property, value) {
      if (value !== undefined) {
        this.setPath('r.value', value.r);
        this.setPath('g.value', value.g);
        this.setPath('b.value', value.b);
      }
      return { r: this.getPath('r.value'), g: this.getPath('g.value'), b: this.getPath('b.value') };
    }).property(),
    childViews: [ 'r', 'g', 'b' ],
    r: UI.SpinnerView.extend({ }),
    g: UI.SpinnerView.extend({ }),
    b: UI.SpinnerView.extend({ })
  }),

  hsb: Em.ContainerView.extend({
    childViews: [ 'h', 's', 'b' ],
    classNames: "ember-colorpicker-hsb",
    valueDidChange: Ember.observer(function(view, property, value) {
      var hsb = this.get('value');
      hsb[property.charAt(0)] = value;
      this.set('value', hsb);
    }, 'h.value', 's.value', 'b.value'),
    value: Ember.computed(function(property, value) { 
      if (value !== undefined) {
        this.setPath('h.value', value.h);
        this.setPath('s.value', value.s);
        this.setPath('b.value', value.b);
        this.setPath('parentView.overlay.knob.top', Math.round(value.b * 1.5));
        this.setPath('parentView.overlay.knob.left', Math.round(value.s * 1.5));
        this.setPath('parentView.hue.value', value.h);
        this.getPath('parentView.overlay.knob').updatePosition();
      }
      return { h: this.getPath('h.value'), s: this.getPath('s.value'), b: this.getPath('b.value') };
    }).property(),
    h: UI.SpinnerView.extend({ }),
    s: UI.SpinnerView.extend({ }),
    b: UI.SpinnerView.extend({ })
  }),

  hex: Em.TextField.extend({
    classNames: 'hex',
    valueBinding: "parentView.value"
  }),
  toHex : function(n) {
   if (n==null) return "00";
   n=parseInt(n); if (n==0 || isNaN(n)) return "00";
   n=Math.max(0,n); n=Math.min(n,255); n=Math.round(n);
   return "0123456789ABCDEF".charAt((n-n%16)/16)
        + "0123456789ABCDEF".charAt(n%16);
  },
  rgbToHex: function (rgb) {
    return this.toHex(rgb.r)+this.toHex(rgb.g)+this.toHex(rgb.b);
  },
  hsbToHex: function (hsb) {
    return this.rgbToHex(this.hsbToRgb(hsb));
  },
  rgbToHsb: function (rgb) {
    var hsb = {
      h: 0,
      s: 0,
      b: 0
    };
    var min = Math.min(rgb.r, rgb.g, rgb.b);
    var max = Math.max(rgb.r, rgb.g, rgb.b);
    var delta = max - min;
    hsb.b = max;
    if (max != 0) {
      
    }
    hsb.s = max != 0 ? 255 * delta / max : 0;
    if (hsb.s != 0) {
      if (rgb.r == max) {
        hsb.h = (rgb.g - rgb.b) / delta;
      } else if (rgb.g == max) {
        hsb.h = 2 + (rgb.b - rgb.r) / delta;
      } else {
        hsb.h = 4 + (rgb.r - rgb.g) / delta;
      }
    } else {
      hsb.h = -1;
    }
    hsb.h *= 60;
    if (hsb.h < 0) {
      hsb.h += 360;
    }
    hsb.s *= 100/255;
    hsb.b *= 100/255;
    hsb.h = Math.floor(hsb.h);
    hsb.s = Math.floor(hsb.s);
    hsb.b = Math.floor(hsb.b);
    return hsb;
  },
  hsbToRgb: function (hsb) {
        var rgb = {};
        var h = Math.round(hsb.h);
        var s = Math.round(hsb.s*255/100);
        var v = Math.round(hsb.b*255/100);
        if(s == 0) {
          rgb.r = rgb.g = rgb.b = v;
        } else {
          var t1 = v;
          var t2 = (255-s)*v/255;
          var t3 = (t1-t2)*(h%60)/60;
          if(h==360) h = 0;
          if(h<60) {rgb.r=t1; rgb.b=t2; rgb.g=t2+t3}
          else if(h<120) {rgb.g=t1; rgb.b=t2; rgb.r=t1-t3}
          else if(h<180) {rgb.g=t1; rgb.r=t2; rgb.b=t2+t3}
          else if(h<240) {rgb.b=t1; rgb.r=t2; rgb.g=t1-t3}
          else if(h<300) {rgb.b=t1; rgb.g=t2; rgb.r=t2+t3}
          else if(h<360) {rgb.r=t1; rgb.g=t2; rgb.b=t1-t3}
          else {rgb.r=0; rgb.g=0; rgb.b=0}
        }
        return {r:Math.round(rgb.r), g:Math.round(rgb.g), b:Math.round(rgb.b)};
      },
});