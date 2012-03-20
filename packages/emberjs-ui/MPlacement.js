UI.MPlacement = Ember.Mixin.create({
	moveTo: function(widget, position, direction)
	{
		if (!position) position = "left-bottom";
		if (!direction) direction = "down";

		position = position.split("-");
		var alignX = position[0], alignY = position[1];

		var offset = widget.$().offset();
		var widgetHeight = widget.$().outerHeight();
		var widgetWidth = widget.$().outerWidth();
		offset.bottom = offset.top + widgetHeight;

		// inspired by qooxdoo (qx.ui.core.MPlacement)
		var viewport = {};
		viewport.height = $(window).height();
		viewport.width = $(window).width();

		// distance to the bottom and top borders of the viewport
		var spaceToTop = offset.top;
		var scrollTop = $(window).scrollTop();
		var spaceToBottom = viewport.height - offset.bottom + scrollTop;

		var availableHeigth = 0, top = 0, left = offset.left;

		if (alignX == "right") left += widgetWidth + 1;

		var popupHeight = this.$().height();

		if ((direction == "down")  || (direction == "down-up" && spaceToBottom > popupHeight))
		{
			availableHeigth = spaceToBottom;
			if (alignY == "bottom")
			{
				top = widgetHeight + offset.top - 1;
			}
			else if (alignY == "top")
			{
				top = offset.top;
			}
		}
		else
		{
			availableHeigth = spaceToTop;
			if (alignY == "top")
			{
				top = offset.top - popupHeight - 1;
			}
			else if (alignY == "bottom")
			{
				top = offset.top - popupHeight + widgetHeight;
			}
		}

		this.$().css({top: top, left: left, maxWidth: availableHeigth});
	}
});