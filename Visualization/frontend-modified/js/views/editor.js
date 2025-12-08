var EditorView = Backbone.View.extend({
	initialize: function () {
		this.template = _.template($('#tmpl_editor').html());
		this.annotate = this._annotate.bind(this);
		$(window).on('resize', this.resizeEditor.bind(this));
		this.render();
	},

	render: function () {
		this.$el.empty().append(this.template({
			code: localStorage.y86_64_sim_src || $('#default_y86_code').html()
		}));

		this.$editor = this.$('.code');
		this.editor = ace.edit(this.$editor.get(0));
		this.editor.setTheme('ace/theme/textmate');
		this.editor.getSession().setMode('ace/mode/y86');
		this.editor.on('change', this.deferredRecompile.bind(this));
		this.resizeEditor();
	},

	getSource: function () {
		return this.editor.getValue();
	},

	setSource: function (source) {
		this.editor.setValue(source);
		this.editor.clearSelection(); // Clear the automatic selection after setValue
	},

	resizeEditor: function () {
		// Use flex layout - set code div to absolute positioning within its flex container
		if (!this.$editor || !this.$editor.length) return;

		// Force ACE to recalculate its size
		if (this.editor && this.editor.resize) {
			this.editor.resize();
		}
	},

	deferredRecompile: function () {
		if (this.recompileTimeout)
			window.clearTimeout(this.recompileTimeout);
		this.recompileTimeout = window.setTimeout(this.annotate, 500);
	},

	_annotate: function () {
		// No annotation needed for .yo files (they're already compiled)
		this.editor.getSession().setAnnotations([]);
	}
});
