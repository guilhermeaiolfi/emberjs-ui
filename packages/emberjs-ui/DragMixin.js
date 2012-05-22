var UI = UI || {};
UI.DragMixin = Ember.Mixin.create({
    delay: 0,    
    init: function()
    {
        this._super();
        this._mouseUpDelegate = $.proxy(this.mouseUp, this);
        this._mouseMoveDelegate = $.proxy(this.mouseMove, this);

    },        
    didInsertElement: function()
    {
      this.$().css("position", "relative");
      //this.$().css("left", "0");
    },
    mouseDown: function(event)
    {
        //(this._mouseStarted && this.mouseUp(event));
        this.dragging = true;
        this._mouseDownEvent = event;

        $(window)
            .bind('mousemove', this._mouseMoveDelegate)
            .bind('mouseup', this._mouseUpDelegate);

        this.canDrag = true;
        this.dragStart(event);
        event.preventDefault();
        return true;
    },
    mouseUp: function()
    {
        this.dragging = false;
        this.dragEnd(event);
        $(window)
            .unbind('mousemove', this._mouseMoveDelegate)
            .unbind('mouseup', this._mouseUpDelegate);
    },
    mouseMove: function(event)
    {
        // IE mouseup check - mouseup happened when mouse was out of window
        //console.log($.browser.msie, document.documentMode, event.button);
        if ($.browser.msie && !(document.documentMode >= 9) && !event.button) {
            return this.mouseUp(event);
        }
        if (this.dragging === true && this.canDrag)
        {
            this.drag(event);
            var delay = this.get('delay'),
                that = this;
            if (delay > 0) {
                this.canDrag = false;
                this._mouseDelayTimer = setTimeout(function() {
                    that.canDrag = true;
                }, delay);
            }
        }
    },
    dragStart: Ember.K,
    dragEnd: Ember.K,
    drag: Ember.K
});