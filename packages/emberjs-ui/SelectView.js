UI.SelectView = Em.ContainerView.extend({
	childViews: ['display', 'button', 'popup'],
	viewName: 'selectView',
	classNames: ["ember-selectview"],
	attributeBindings: ['tabindex', 'unselectable'],
	unselectable: 'on',
	tabindex: 0,

	label: function()
	{
		var selection = this.get('popup').get('selection');
		if (selection.get('length') === 0) {
			return "-";
		}
		return selection.objectAt(0).get('content').get('name');
	}.property('popup.selection.@each').cacheable(),

	display: Em.View.extend({
		textBinding: "parentView.label",
		classNames: ['ember-selectview-display'],
		text: function(key, value)
		{
			if (value !== undefined)
			{
				var self = this;
				setTimeout(function() { self.$().html(value); }, 0);
				return value;
			}
			return this.get('parentView.label');
		}.property().cacheable()

	}),

	popup: UI.ListView.create(UI.MPlacement, {
		isVisible: false,
		contentBinding: 'parentView.content',
		valueBinding: 'parentView.value',
		templateBinding: "parentView.template"
	}),

	button: Em.View.extend({
		template: Em.Handlebars.compile(""),
		classNames: ['ember-selectview-button', 'icon-chevron-down']
	}),

	beforePopupShow: Em.beforeObserver(function(){
		var popup = this.get('popup');
		if (!popup.get('isVisible'))
		{
			this.$().addClass("active");
			popup.moveTo(this, "left-bottom", "down-up");
			popup.$().css({ minWidth: this.$().width() });
		}
		else
		{
			this.$().removeClass("active");
		}
	}, 'popup.isVisible'),

	afterPopupShow: Em.observer(function(){
		var self = this;
		var popup = this.get('popup');
		if (popup.get('isVisible')) { setTimeout(function(){ popup.$().focus(); }, 0); }
	}, 'popup.isVisible'),

	/**
	*	Hide popup if popup loses focus, but it can lose focus because it was clicked and
	*	focus was set to selectview
	**/
	onPopupFocusChange: Em.observer(function(){
		var popup = this.get('popup');
		
		if ((popup.get('isVisible') && !popup.get('hasFocus') && !this.$().is(":focus")))
		{
			popup.set('isVisible', false);
		}
		

	}, 'popup.hasFocus'),

	mouseDown: function(e){
		var popup = this.get('popup');
		if (!popup.get('hasFocus'))
			popup.set("isVisible", !popup.get('isVisible'));

	},

	afterSelectionChange: Em.observer(function (){
		var popup = this.popup;
		setTimeout(function(){ popup.$().blur(); }, 0);
	}, 'value')

});

UI.MenuBarView = Em.View.extend({
	tagName: "ul",
	classNames: ["ember-menubarview"],
	attributeBindings: ['unselectable'],
	unselectable: 'on'
});

UI.MenuItemView = Em.View.extend({
		tagName: 'li',
		classNames: ["ember-menuview-item"],
		attributeBindings: ['unselectable'],
		unselectable: 'on',
		template: Handlebars.compile("{{label}} {{content}}"),
		click: function(e)
		{
			var menu_popup_el = $(e.target).find("ul")[0];

			if (menu_popup_el)
			{
				var menu_popup_widget = Em.View.views[menu_popup_el.id];
				menu_popup_widget.moveTo(this, "left-bottom", "down");
				var isVisible = menu_popup_widget.get("isVisible");
				menu_popup_widget.set("isVisible", !isVisible);
				console.log(this);
			}
		}
});

UI.MenuPopupView = Em.View.extend(UI.MPlacement, {
	tagName: "ul",
	viewName: 'MenuViewContainer',
	classNames: ["ember-menupopupview"],
	attributeBindings: ['unselectable'],
	unselectable: 'on',
	didInsertElement: function()
	{
		this._super();
		this.set("isVisible", false);
	}
});