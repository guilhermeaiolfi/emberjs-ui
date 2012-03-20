var get = Ember.get, set = Ember.set;
UI = {};
UI.ListView = Em.CollectionView.extend({
	tagName: "ul",
	viewName: 'ListViewContainer',
	classNames: ["ember-listview"],
	attributeBindings: ['tabindex', 'unselectable'],
	unselectable: 'on',
	tabindex: 0,
	mode: 'single',
	splitChat: ',',
	idField: 'id',
	concat: false,
	hasFocus: false,

	childTemplate: function() { return "parentView.template"; },

	itemViewClass: Em.View.extend({
		tagName: 'li',
		selected: false,
		head: false,
		classNames: ["ember-listview-item"],
		classNameBindings: ["selected", "head"],
		attributeBindings: ['unselectable'],
		unselectable: 'on',
		contentBinding: "*content",
		templateContext: Ember.computed(function(key, value) {
			return value !== undefined ? value : get(this, 'content');
		}).cacheable(),
		templateBinding: "parentView.template"
	}),
	head: null,

	_selection: Ember.A(),

	selection: Ember.computed(function(key, value){
		if (value !== undefined)
		{
			set(this, '_selection', value);
		}
		return get(this, '_selection');
	}).property('_selection').cacheable(),

	focusIn: function()
	{
		this.set('hasFocus', true);
	},

	focusOut: function()
	{
		this.set('hasFocus', false);
	},

	click: function(e)
	{
		this.$().focus();
		var self = this,
			head = get(this, 'head'),
			childViews = get(this, 'childViews'),
			clicked = null,
			target = e.target.tagName != 'LI'? $(e.target).parent("li").get(0) : e.target;

		if (!e.ctrlKey)
		{
			this.clearSelection();
		}
		get(this, 'childViews').forEach(function(el, idx) {
			var content = get(el, 'content');
			var id = el.$()[0].id;

			if (id == target.id) {
				return clicked = el;
			}
		});

		if (!clicked) return;

		var content = get(clicked, 'content');

		if (e.shiftKey && this.get('mode') == 'multi')
		{
			var start = childViews.indexOf(clicked);
			var end = head? childViews.indexOf(head) : -1;
			if (end != -1)
			{
				if (start > end)
					this.selectRange(end, start);
				else
					this.selectRange(start, end);
			}
		}
		else
		{
			this.toggle(clicked);
		}
		set(this, 'head', clicked);
	},

	clearSelection: function()
	{
		var self = this;
		var selection = this.get('_selection');
		for (var i = (selection.length - 1); i >= 0; i--)
		{
			self.deselect(selection.objectAt(i));
		}
	},

	toggle: function(el)
	{
		if (el.get('selected'))
			this.deselect(el);
		else
			this.select(el);
	},

	select: function(el)
	{
		set(el, 'selected', true);
		var selection = get(this, "_selection");
		var head = get(this, 'head');
		if (head) set(head, 'head', false);
		set(this, 'head', el);
		if (get(this, 'mode') == 'single')
		{
			this.clearSelection();
		}
		selection.pushObject(el);
	},

	deselect: function(el)
	{
		set(el, 'selected', false);
		get(this, "_selection").removeObject(el);
	},

	selectRange: function(start, end)
	{
		var childViews = get(this,'childViews');
		for(var i = start; i <= end; i++)
		{
			var obj = childViews.objectAt(i);
			if (!obj.get('selected'))
				this.select(obj);
		}
	},

	value: Ember.computed(function(key, newValue) {
		
		var childViews = get(this, 'childViews'),
			ret = Ember.A(),
			selection = get(this, '_selection'),
			self = this, typeOf = "number";
		
		if (childViews.length === 0)
		{
			this.set('late_value', newValue);
		}

		else if (this.get('late_value'))
		{
			var new_value = this.get('late_value');
			this.set('late_value', null);
			this.set('value', new_value);
			return ret;
		}

		if (newValue !== undefined )
		{
			if (Ember.typeOf(newValue) == "string")
				newValue = Ember.A(newValue.split(get(this, 'splitChar')));
			
			if (Em.typeOf(newValue) == 'array' && newValue.length > 0)
			{
				typeOf = Ember.typeOf(newValue.objectAt(0));
			}
		}

		childViews.forEach(function(view) {
			var content = get(view, 'content'),
				id = get(content, 'id');

			if (newValue === undefined)
			{
				if (selection.contains(view))
				{
					ret.pushObject(id);
				}
			}
			else
			{
				var selection_contains_view = selection.contains(view);
				
				id = (typeOf == "string")? (id + "") : parseInt(id);

				var	newValue_contains_id = newValue.contains(id);

				if (newValue_contains_id && !selection_contains_view)
				{
					self.select(view);
				}
				else if (!newValue_contains_id && selection_contains_view)
				{
					self.deselect(view);
				}
				ret.pushObject(id);
			}
		});

		if (this.get('concat'))
		{
			return ret.join(this.get("splitChar"));
		}

		return ret;

	}).property('_selection.@each', 'childViews.length').cacheable(),

	keyDown: function(e)
	{
		var head = this.get('head');
		if (head)
		{
			if (e.keyCode == 40) // DOWN ARROW
			{
				var next = this.next();
				if (next)
				{
					head.set('head', false);
					this.set('head', next);
					next.set('head', true);
				}
			}
			else if (e.keyCode == 38) // UP ARROW
			{
				var prev = this.prev();
				if (prev)
				{
					head.set('head', false);
					this.set('head', prev);
					prev.set('head', true);
				}
			}
			else if (e.keyCode == 32) // SPACE
			{
				this.toggle(head);
			}
		}
		return false;
	},

	next: function()
	{
		var head = this.get('head'), next = null;
		if ((next = $(head.$()).next()[0]))
		{
			return Ember.View.views[next.id];
		}
		return null;
	},

	prev: function(el)
	{
		var head = this.get('head'), prev = null;
		if ((prev = $(head.$()).prev()[0]))
		{
			return Ember.View.views[prev.id];
		}
		return null;
	}
});