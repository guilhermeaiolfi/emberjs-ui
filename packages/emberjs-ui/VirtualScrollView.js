/**
VirtualScrollView recreates the functionality of Ember.Collection
with one benefit: It will render just DOM nodes that are are relevant to the
user.

That way you can have a List, for example, that have 50k items and it will
render the same way that it would if it would have just 20.

It achieves that by dividing the content array in "pages". Each page has a
number of items (itemsPerPage) that is calculated automatically considering
the height of the view. It has a little more than just the ones visible in
view so it doesn't need to load another page on every scroll event.

It caches the items views so it doesn't need to recreate them every time it
load a new page.

The number of active pages can be configured using the "maxPages" property.

VirtualScrollView handles variable heights too. It is able to readjust itself
on demand when loading items and calculating their heights. You can
enable/disable this feature using the property "fixedHeight", when
"fixedHeight" is set to true, any calculation regarding heights are skipped.
That way it performs much faster when working that way.

Example of how to use it:
UI.MyScrollList = UI.VirtualScrollView.extend({
  itemViewClass: Ember.ContainerView.extend({
        childViews: ['a','b'],
        a:Ember.View.extend({
             classNames: ['left'],
            contentBinding: "parentView.content",
                  template: Ember.Handlebars.compile("{{content.idx}}"),
        }),
        b:Ember.View.extend({
            classNames: ['right'],
            contentBinding: "parentView.content",
            template: Ember.Handlebars.compile("{{content.h}}px"),
        })            
  }),

  configureChildView: function(view, content, idx) {
      this._super(view, content, idx);   
      view.$().css("height", content.get('h'));
  },

  itemHeight: 20,
  fixedHeight: false,
  scrollDelay: 200,
  // it is a feature of UI.ScrollerView and makes the scrolling much
  // flickering free
  replaceThumb: true
});

App.array = Ember.A();
for (var i = 0; i < 5000; i++)
{
  var o = Ember.Object.create({idx: i, h: 20 + Math.ceil(Math.random() * 50)});
  App.array.pushObject(o);
}
**/

UI.VirtualScrollView = UI.ScrollerView.extend({
    // it should be replaced when sub-classing
    itemViewClass: Ember.View.extend({
    }),

    // number of items per page, calculate automatically by this.adjustPortSize
    itemsPerPage: 10,
    
    // height of each row, used to create some defaults (page height, pages
    // positon) when 'fixedHeight' is set to false. Otherwise, it's used to
    // calculate the absolute position directly. So, very important when
    // 'fixedHeight' is set to 'true'.
    itemHeight: 20,

    // index of pages currently loaded
    loadedPages: [],

    // array of UI.VirtualPage for every loadedPages items
    pages: Ember.A(),

    // array of child views
    cacheChildViews: Ember.A(),

    // max of pages loaded, it shouldn't be less then 2 because you can be
    // viewing the end of page 1 and the start of page 2, for example.
    maxPages: 3,

    // after loading a new page and knowing for sure its height, we store this
    // information in this array
    pagesHeight: [],

    // the same way the previous property store each page height, this array
    // stores each page top position
    pagesTops: [],

    // number of pages for the current 'content', calculate automatically
    pageCount: 0,

    // whether it's scrolling or not
    scrollerState: 'idle',

    // whether each row are always the same or it is different for every item.
    // if your rows have all the same height, set this to true and it will
    // perform much faster
    fixedHeight: false,
   
    /**
      If the VirtualScrollView is resized or the 'itemHeight' changes,
      'pagesHeight', 'pageTops' 'pageCount' needs to be recalculated to
      reflect that.
    **/
    adjustPortSize: Ember.observer(function() {
        
        var item_height = get(this, 'itemHeight'),
            items_per_page = get(this, 'itemsPerPage'),
            content = get(this, 'content'),
            pages_tops = get(this, 'pagesTops'),
            pages_height = get(this, 'pagesHeight'),
            loaded_pages = get(this, 'loadedPages');

        items_per_page = Math.ceil((this.$().height() / item_height) * 1.5);
        this.set('itemsPerPage', items_per_page);
        
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

    /**
      Update the top position of a range of pages
    **/
    updatePagesTops: function (start, end) {
      var page_count = this.get('pageCount'),
          pages_tops = this.get('pagesTops'),
          pages_height = this.get('pagesHeight'),
          max_pages = this.get('maxPages'),
          loaded_pages = this.get('loadedPages'),
          pages = this.get('pages'),
          new_top = 0,
          extra = 0,
          prev_top = 0,
          height = 0;

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
      height = pages_tops[page_count - 1] + pages_height[page_count - 1];
      this.updateCollectionViewSize(height);
    },
    
    /**
      it creates an array of views and include them in the 'childViews' array
      so it can be displayed. If those views are already in the 'childViews'
      array we don't need to do much besides telling UI.VirtualPage to update
      itself.
    **/
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
   
    /**
      When this is called we should know at least the container height.
    **/
    didInsertElement: function() {
      this._super();
      this.adjustPortSize();
    },

    /**
      Discover which pages should be load for a scrollTop position and the
      direction that it was scrolled on
    **/
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

    /**
      Scroll event override from UI.ScrollerView
    **/
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

    /**
      Scrolls to an item index. If 'fixedHeight' is false and the page is not
      currently loaded, the scroll to that item is done async since we don't
      know exactly its position in the container until it's there
    **/
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

    /**
      Loads a new page
    **/
    loadPage: function(page_number) {
      var loaded_pages = this.get('loadedPages'),
          pages = this.get('pages');

      if (loaded_pages.contains(page_number)) {
        loaded_pages.removeAt(loaded_pages.indexOf(page_number));
        loaded_pages.pushObject(page_number);
        return false;
      }
      
      var page = pages[page_number] = UI.VirtualPage.create({ index: page_number, scroller: this, scrollTop: this.getScrollTop() });
      
      this.loadViews(page_number, page);
      var item_height = this.get('itemHeight');
      var items_per_page = this.get('itemsPerPage');
      loaded_pages.pushObject(page_number);
      return true;
    },

    /**
      Removes a page
    **/
    removePage: function(page_number) {
      var loaded_pages = this.get('loadedPages');
      if (!loaded_pages.contains(page_number)) { return false; }
      
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

    /**
      Returns the corresponding page number of the 'scrollTop' position
    **/
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

    /**
      Same as Ember.Collection with some adjustments to reflect the new content
    **/
    _contentDidChange: Ember.observer(function() {
      var content = get(this, 'content');

      if (content) {
        ember_assert(fmt("an Ember.CollectionView's content must implement Ember.Array. You passed %@", [content]), Ember.Array.detect(content));
        content.addArrayObserver(this);
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

    /*
      The array observer is attached to the content, so it needs to be removed
      when changing the content's array
    */
    _contentWillChange: Ember.beforeObserver(function() {
      var content = this.get('content');
      if (content) { content.removeArrayObserver(this); }
      var len = content ? get(content, 'length') : 0;
    }, 'content'),

    /*
      I don't think we need this
    */
    arrayWillChange: function(content, start, removedCount) {
    },

    /**
      When there is a change in the array's content (remove or add any items to
      it), it needs to update the view to reflect those changes. It is not as
      simple as removing this view from the DOM as it is in the
      Ember.Collection because the page where the item remove, for example,
      will have a different height and therefor will change the top position
      of next pages. So the easier way to do that is to reload the page.
    **/
    arrayDidChange: function(content, start, removed, added) {
      var page_number = Math.floor(start / this.get('itemsPerPage'));
      if (this.removePage(page_number))
      {
        this.loadPage(page_number);
      }
    },

    /**
      Basically it's here to remove the array observer.
    **/
    willDestroy: function() {
      var content = get(this, 'content');
      if (content) { content.removeArrayObserver(this); }
      this._super();
    },

    /**
      This method creates the child views when first needed. After creating
      enough child views it won't be called anyone.
    **/
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
    
    /**
      A child view is not unique in a VirtualScrollView. It reuses the ones
      created earlier for performance reasons. So we need a way to reconfigure
      those views when its content changes. That's done in the
      configureChildView and should be override if needed.

      Node that if you are override this method you still need to call
      this._super() for VirtualScrollView to work correctly.
    **/
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

/**
 This class performs the update and has some useful information about the
 pages loaded in the VirtualScrollView.
**/

UI.VirtualPage = Ember.Object.extend({
  // top position of the page
  top: null,
  // index of the page
  index: 0,
  // items views managed by this page
  views: Ember.A(),
  // reference to the VirtualScrollView instance
  scroller: null,
  // indicate if all view items of this page are rendered and in the DOM
  inDOM: false,
  /**
    when a page is loaded it saves the current scrollTop position because
    after loading it can be in a different position and it won't display the
    right items. So we save that so we can reset the scrollTop position for
    that later on the update method.
  **/
  scrollTop: 0,

  /**
    This method is called when 'top' and 'inDOM' properties are set. That
    way we know when all DOM nodes are in the DOM and when we know where its
    position in the container. After that we can readjust the position for
    every item.
  **/
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