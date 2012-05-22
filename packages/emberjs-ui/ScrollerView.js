var UI = UI || {};

var get = Ember.get, fmt = Ember.String.fmt, set = Ember.set;

UI.ScrollerView = Ember.ContainerView.extend({
  scrollDelay: 0,
  replaceThumb: true,
  classNames: ['ember-scroller'],
  // borrow from: https://raw.github.com/cowboy/jquery-throttle-debounce/v1.1/jquery.ba-throttle-debounce.js
  throttle: function(delay, no_trailing, callback, debounce_mode) {
    var timeout_id,
      last_exec = 0;

    if (typeof no_trailing !== 'boolean') {
      debounce_mode = callback;
      callback = no_trailing;
      no_trailing = undefined;
    }

    function wrapper() {
      var that = this,
        elapsed = +new Date() - last_exec,
        args = arguments;
      
      function exec() {
        last_exec = +new Date();
        callback.apply(that, args);
      };
      
      function clear() {
        timeout_id = undefined;
      };
      
      if (debounce_mode && !timeout_id) {
        exec();
      }
      
      timeout_id && clearTimeout(timeout_id);
      
      if (debounce_mode === undefined && elapsed > delay) {
        exec();
        
      } else if (no_trailing !== true) {
        timeout_id = setTimeout(debounce_mode ? clear : exec, debounce_mode === undefined ? delay - elapsed : delay);
      }
    };
    
    if ($.guid) {
      wrapper.guid = callback.guid = callback.guid || $.guid++;
    }
    
    return wrapper;
  },
  init: function()
  {
    this._super();
    if (!this.get('replaceThumb')) {
        this.get('childViews').popObject();
        this.set('sb', this);
    }
    else
    {
        this.set('sb', this.thumb);
    }
  },
  didInsertElement: function()
  {
      var scroll = $.proxy(this.scroll, this);
      var scrollEnd = $.proxy(this.scrollEnd, this);

      var sb = this.get('sb');
      if (this.scrollDelay === 0) {
        sb.$().scroll(scroll);
        sb.$().scroll(this.throttle(500, scrollEnd, false));
      }
      else {
        sb.$().scroll(this.throttle(this.scrollDelay, false, scroll));
        sb.$().scroll(this.throttle(500, scrollEnd, false));
      }
      
      this.$().css("overflow", this.get('replaceThumb')? 'hidden' : 'auto');
      if (this.get('replaceThumb'))
      {
        this.$().css("position", 'relative');
        var mouseWheel = $.proxy(this.mouseWheel, this);
        this.$().on("mousewheel", mouseWheel);
      }
  },
  /*
    It needs https://raw.github.com/brandonaaron/jquery-mousewheel/master/jquery.mousewheel.js
    for that to work corretly. Mainly for the normalize function. Otherwise we could use:
      evt.originalEvent.wheelDelta
  */
  mouseWheel: function(evt, delta) {
      this.thumb.$().scrollTop(this.thumb.$().scrollTop() - (delta * 30));
  },
  setScrollTop: function(scroll_top)
  {
      // here we can override to anime the scroll event
      if (this.get('replaceThumb'))
      {
        this.collection.$().css({'top': - scroll_top});
        this.thumb.$().scrollTop(scroll_top);
      }
      else
      {
        this.get('sb').$().scrollTop(scroll_top);
      }
  },
  getScrollTop: function()
  {
    var height = this.$().height();

    if (!this.get('replaceThumb'))
        return this.$().scrollTop();
      
    var thumb_height = this.thumb.$(".sb_content").height();
     
    var thumb_scroll_top = this.thumb.$().scrollTop();
   
    var collection_height = this.collection.$().height();

    var ratio = collection_height  / thumb_height;
      
    var scroll_top = Math.floor(thumb_scroll_top * ratio);

    return scroll_top;
  },
  childViews: ['collection', 'thumb'],
  thumb: Ember.View.extend({
      name: 'thumb',
      allwoUpdate: true,
      template: Ember.Handlebars.compile("<div class=\"sb_content\" style=\"height: 3000px\"></div>"),
      didInsertElement: function()
      {
          this.$().css("position", "absolute");
          this.$().css("top", 0);
          this.$().css("right", 0);
          this.$().css("width", 20);
          this.$().css("height", '100%');
          this.$().css("overflowY", "auto");
          this.$().css("overflowX", "hidden");
      },
      mouseEnter: function()
      {
          this.set('allowUpdate', false);
      },
      mouseLeave: function()
      {
          this.set('allowUpdate', true);
      }
  }),
  collection: Ember.ContainerView.extend(
  {
      name: 'collection',
      itemViewClassBinding: "parentView.itemViewClass",
      contentBinding: 'parentView.content',
      didInsertElement: function() {
        var len = this.get('content').get('length');
        this.$().css("position", "relative");
        this.$().css('height', this.get('parentView').get("itemHeight")*len);
      }
  }),

  updateCollectionViewSize: function(height) {
    this.collection.$().height(height);
    if (this.get('replaceThumb'))
        this.thumb.$(".sb_content").css('height', height);
  },
  
  scroll: Ember.K,
  scrollEnd: Ember.K
});