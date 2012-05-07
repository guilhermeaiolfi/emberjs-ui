

UI.VirtualScrollView = UI.ScrollerView.extend({
    itemViewClass: Ember.View.extend({
       
    }),
    itemsPerPage: 10,
    itemHeight: 20,
    loadedPages: [],
    pages: Ember.A(),
    cacheChildViews: Ember.A(),
    maxPages: 3,
    pagesHeight: [],
    pagesTops: [],
    pageCount: 0,
    scrollerState: 'idle',
    fixedHeight: false,
   
    adjustPortSize: Ember.observer(function() {
        
        var item_height = get(this, 'itemHeight'),
            items_per_page = get(this, 'itemsPerPage'),
            content = get(this, 'content'),
            pages_tops = get(this, 'pagesTops'),
            pages_height = get(this, 'pagesHeight'),
            loaded_pages = get(this, 'loadedPages');

        
        console.log("adjusting port size");
        items_per_page = Math.ceil((this.$().height() / item_height) * 1.5);
        this.set('itemsPerPage', items_per_page);
        //console.log("new itemsPerPage", this.get('itemsPerPage'), this.get('itemHeight'));
        
        var page_count = Math.ceil(content.get('length') / items_per_page);
        this.set('pageCount', page_count);

        this.get('pagesHeight').clear();
        this.get('pagesTops').clear();

        for (var i = 0; i < page_count; i++) {
          pages_height[i] = item_height * items_per_page;
          pages_tops[i] = i > 0? pages_tops[i-1]  + item_height * items_per_page : 0;
        }

        if (loaded_pages.length === 0) {
           this.loadPage(0);
        }

    }, 'itemHeight'),

    updatePagesTops: function (start, end) {
      var page_count = this.get('pageCount'),
          pages_tops = this.get('pagesTops'),
          pages_height = this.get('pagesHeight'),
          max_pages = this.get('maxPages'),
          loaded_pages = this.get('loadedPages'),
          pages = this.get('pages'),
          new_top = 0,
          extra = 0,
          prev_top = 0;

      end = end > page_count? page_count : end;

      for (var i = start; i < end; i++) {
        prev_top = i? pages_tops[i - 1] : 0;
        new_top = i? prev_top + pages_height[i - 1] : 0;
        if (pages_tops[i] != new_top)
        {
            extra += new_top - pages_tops[i];
            pages_tops[i] = new_top;
            if (loaded_pages.contains(i))
            {
              pages[i].set('top', new_top);
            }
        }
      }
      if (end != page_count) pages_tops[page_count - 1] += extra;
      //console.log("changed", extra, pages_tops[page_count - 1] + pages_height[page_count - 1]);
      this.updateCollectionViewSize(pages_tops[page_count - 1] + pages_height[page_count - 1]);
    },
                                              
    loadViews: function(page_number, page) {
      var itemViewClass = get(this, 'itemViewClass'),
          childViews = get(this.collection, 'childViews'),
          content = get(this, 'content'),
          itemsPerPage = get(this, 'itemsPerPage'),
          addedViews = [], view, item, idx, len, itemTagName;

      if ('string' === typeof itemViewClass) {
        itemViewClass = Ember.getPath(itemViewClass);
      }

      ember_assert(fmt("itemViewClass must be a subclass of Ember.View, not %@", [itemViewClass]), Ember.View.detect(itemViewClass));

      var added = this.get('itemsPerPage');
      len = content ? get(content, 'length') : 0;
      if (len) {
        var begin = itemsPerPage * page_number;
        var end = (itemsPerPage * page_number) + itemsPerPage;
        if (end > len)
          end = len;
        for (idx = begin; idx < end; idx++) {
          item = content.objectAt(idx);

          view = this.getChildView(itemViewClass, item, idx);

          addedViews.pushObject(view);
        }
      } else if (len === 0) {
        var emptyView = get(this.collection, 'emptyView');
        if (!emptyView) { return; }

        emptyView = this.createChildView(emptyView);
        addedViews.push(emptyView);
        set(this, 'emptyView', emptyView);
      }
      page.set('views', addedViews);

      if (!childViews.contains(view)) {
        childViews.addObjects(addedViews);
      }
      else {
        page.set('inDOM', true);
        page.set('top', this.get('pagesTops')[page.get('index')]);
      }
    },
   
    didInsertElement: function() {
      this._super();
      this.adjustPortSize();
    },

    pagesToLoad: function(scrollTop, direction) {
      var itemsPerPage = this.get('itemsPerPage'),
          currentPage = this.pageFromScrollTop(scrollTop),
          item_height = this.get('itemHeight'),
          page_count = this.get('pageCount');

      var offsetY = this.$().height();
      var pages = [];
      var limiterTop = scrollTop - offsetY;
      var limiterBottom = scrollTop + (1.2*offsetY);
      
      pages.push(currentPage);

      var nextPage = this.pageFromScrollTop(limiterBottom);

      if (nextPage != currentPage) {
          pages.push(nextPage);
      }
      
      if (limiterTop > 0) {
        nextPage = this.pageFromScrollTop(limiterTop);
        if (nextPage != currentPage) {
          pages.push(nextPage);
        }
      }
      return pages;
    },

    scroll: function() {
      
      var scrollTop = this.getScrollTop(),
          viewingPage = this.pageFromScrollTop(scrollTop),
          itemsPerPage = this.get('itemsPerPage'),
          page_count = this.get('pageCount'),
          pages_height = this.get('pagesHeight'),
          item_height = this.get('itemHeight'),
          pages_tops = this.get('pagesTops'),
          lastScrollTop = this.currentScrollTop,
          direction = "down";
        
      this.currentScrollTop = scrollTop;
        
      if (this.get('scrollerState') === 'scrolling') return;
        
      this.set('scrollerState', 'scrolling');

      direction = scrollTop < lastScrollTop? "up" : "down";

      var pages = this.pagesToLoad (scrollTop, direction);
      var loadedPages = this.get('loadedPages');

      while(loadedPages.length > this.get('maxPages')) {
        var page_number = loadedPages.objectAt(0);
        this.removePage(page_number);
      }

      for (var i = 0; i < pages.length; i++) {
          
         if (!this.loadPage(pages[i]) && i === 0) {
            this.setScrollTop(scrollTop);
         }
      }

      this.set('scrollerState', 'idle');
    },

    scrollIntoItemIndex: function(index)
    {
      var page = Math.floor(index / this.get('itemsPerPage')),
          pages = this.get('pages'),
          pages_tops = this.get('pagesTops'),
          loaded_pages = this.get('loadedPages');
      
      if (this.get('fixedHeight'))
      {
        this.setScrollTop(index * this.get('itemHeight'));
        return;
      }

      if (loaded_pages.contains(page) )
      {
        var views = pages[page].get('views');
        var len = views.length;
        var top_in_page = 0;
        for (var i = 0; i < len; i++)
        {
          if (views[i].get('contentIndex') === index)
          {
            this.setScrollTop(pages_tops[page] + top_in_page);
            break;
          }
          top_in_page += views[i].$().height();
        }
      }
      else
      {
        this.scheduleScrollToItem = index;
        this.set('scrollerState', 'scrolling');
        this.loadPage(page);
        var self = this;
        setTimeout(function() { self.set('scrollerState', 'idle'); }, 100);
      }
    },

    loadPage: function(page_number) {
      var loaded_pages = this.get('loadedPages'),
          pages = this.get('pages');

      if (loaded_pages.contains(page_number)) {
        loaded_pages.removeAt(loaded_pages.indexOf(page_number));
        loaded_pages.pushObject(page_number);
        return false;
      }
      
      console.log('loading page %d', page_number);
      
      var page = pages[page_number] = UI.VirtualPage.create({ index: page_number, scroller: this, scrollTop: this.getScrollTop() });
      
      this.loadViews(page_number, page);
      var item_height = this.get('itemHeight');
      var items_per_page = this.get('itemsPerPage');
      loaded_pages.pushObject(page_number);
      return true;
    },

    removePage: function(page_number) {
      var loaded_pages = this.get('loadedPages');
      if (!loaded_pages.contains(page_number)) { console.log("page wasn't removed"); return false; }
      console.log('removing page %d', page_number);
      var start = page_number * this.get('itemsPerPage');
      var pages = this.get('pages');
      var page = pages[page_number];

      for(var i = 0; i < page.get('views').length; i++) {
          var view = page.get('views').objectAt(i);
          view.set('isVisible', false);
          this.cacheChildViews.pushObject(view);
      }

      loaded_pages.removeAt(loaded_pages.indexOf(page_number));

      pages[page_number].set('inDOM', false);
      pages[page_number].destroy();
      pages[page_number] = null;
      return true;
    },

    pageFromScrollTop: function(scrollTop) {
      var page_count = this.get('pageCount');
       if (this.get('fixedHeight'))
       {
           return Math.floor(Math.ceil(scrollTop / this.get('itemHeight')) / this.get('itemsPerPage'));
       }
      for (var i = 1; i < page_count; i++)
      {
        if (this.get('pagesTops')[i] > scrollTop)
          return i - 1;
      }
      return page_count - 1;
    },

    _contentDidChange: Ember.observer(function() {
      var content = get(this, 'content');

      if (content) {
        ember_assert(fmt("an Ember.CollectionView's content must implement Ember.Array. You passed %@", [content]), Ember.Array.detect(content));
        content.addArrayObserver(this);
        console.log("adding observer");
      }
      if (content !== null) {
        var loaded_pages = this.get('loadedPages');
        while (loaded_pages.length > 0)
        {
          this.removePage(loaded_pages[0]);
        }
        if (this.get('state') == 'inDOM')
        {
          this.adjustPortSize();
        }
      }
    }, 'content'),

    _contentWillChange: Ember.beforeObserver(function() {
      var content = this.get('content');
      if (content) { content.removeArrayObserver(this); }
      var len = content ? get(content, 'length') : 0;
    }, 'content'),

    arrayWillChange: function(content, start, removedCount) {
      /*var page_number = Math.floor(start / this.get('itemsPerPage'));
      this.scroll();*/
    },

    arrayDidChange: function(content, start, removed, added) {

      var page_number = Math.floor(start / this.get('itemsPerPage'));
      if (this.removePage(page_number))
      {
        this.loadPage(page_number);
      }
    },

    willDestroy: function() {
      var content = get(this, 'content');
      if (content) { content.removeArrayObserver(this); }
      this._super();
    },

    createChildView: function(view, attrs) {
      if (!attrs) attrs = {};
      var scroller = this;
      attrs.didInsertElement = function()
      {
        this._super();
        if (this.state != 'inDOM' || this.get('name') == 'thumb' || this.get('name') == 'collection') return;

        scroller.configureChildView(this, attrs.content, attrs.contentIndex);
      };
      return this._super(view, attrs);
    },

    getChildView: function(view, item, idx) {
      var child_view = null;
      if (!(child_view = this.cacheChildViews.popObject())) {
        child_view = this.createChildView(view, { content: item, contentIndex: idx });
      }
      else
      {
          this.configureChildView(child_view, item, idx);
      }
      return child_view;
    },
    
    configureChildView: function(view, content, idx) {
      var pages = this.get('pages'),
          pages_tops = this.get('pagesTops');
        

      view.$().css("position", "absolute");
  
      if (!this.get('itemHeight') && view.$().height()) {
        this.removePage(0);
        this.set('itemHeight', view.$().height());
      }
      var page_number = Math.floor(idx / this.get('itemsPerPage'));

      view.set('content', content);
      view.set('contentIndex', idx);
      view.set('isVisible', true);

      var page = pages[page_number];

      if (!page) return;

      var views = page.get('views');
      if (page && views.get('lastObject') == view) {
        page.set('inDOM', true);
        page.set('top', pages_tops[page_number]);
      }
    }
});

UI.VirtualPage = Ember.Object.extend({
  height: null,
  top: null,
  index: 0,
  views: Ember.A(),
  scroller: null,
  inDOM: false,
  scrollTop: 0,
  update: Ember.observer(function(object, property, value) {
    var top = this.get('top');
    var scroller = this.get('scroller'),
        views = this.get('views');
    var fixed_height = scroller.get('fixedHeight');
   
    if (!views || top === null || !this.get('inDOM')) return;

    var index = this.get('index');
    var len = views.length;
    for(var i = 0; i < len; i++)
    {
      var view = views.objectAt(i);
      view.$().css("top", top);

      if (!fixed_height && scroller.scheduleScrollToItem === view.get('contentIndex'))
      {
          scroller.setScrollTop(top);
          scroller.scheduleScrollToItem = null;
          this.set('scrollTop', top);
      }
      top += fixed_height? scroller.get('itemHeight') : view.$().height();
    }
     
    if (!fixed_height)
    {
      this.set('height', top - this.get('top'));
      scroller.get('pagesHeight')[index] = this.get('height');
      scroller.updatePagesTops(0, scroller.get('pageCount'));
    }
    if (this.get('inDOM') && this.get('top') !== null) {
        scroller.setScrollTop (this.get('scrollTop'));
    }
   }, 'top', 'inDOM')
});
