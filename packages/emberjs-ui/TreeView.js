/**
*	Tree Widget
*	Thank you Roy Daniels for helping me: http://stackoverflow.com/questions/9843099/how-to-use-the-parentview-template-in-n-nested-children-in-emberjs
*	Example
*	Javascript:
*		App.nodeRoot = Em.A([{ name: "aaa", children: [ { name: "bbb", children: [{ name: 'ccc', children: [ { name: 'ddd' }] }] }, {name: "bbb2"} ]}]);
*
*	Handlebars:
*		{{#view UI.TreeView contentBinding="App.nodeRoot"}}
*			{{name}}
*			{{view UI.TreeChildrenView contentBinding="children"}}
*		{{/view}}
**/

var UI = UI || {};

get = Ember.get, set = Ember.set;

UI.NodeView = Em.View.extend({
	tagName: "li",
	templateContext: Ember.computed(function(key, value) {
		return value !== undefined ? value : get(this, 'content');
	}).cacheable(),
	init: function()
	{
		var treeRootTemplate, rootView;
		if(get(this, 'treeRoot')) rootView = get(this, 'parentView');
		else rootView = this.nearestWithProperty('treeRoot');
		set(this, 'template', get(rootView, 'template'));
		this._super();
	}
});


UI.TreeView = Em.CollectionView.extend({
	tagName: "ul",
	itemViewClass: UI.NodeView.extend({
		treeRoot: true
	})
});

UI.TreeChildrenView = UI.TreeView.extend({
	itemViewClass: UI.NodeView.extend({
	})
});
