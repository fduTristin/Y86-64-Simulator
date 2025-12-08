var AppView = Backbone.View.extend({
	initialize: function () {
		this.template = _.template($('#tmpl_app').html());
		this.editor = new EditorView();
		this.jsonOutput = new JsonOutputView();
		this.inspector = new InspectorView();
		this.memview = new MemoryView();

		this.listenTo(Backbone.Events, 'app:redraw', this.redrawButtons);

		this.render();
		editor = this.editor;
	},

	events: {
		'click .compile': 'compile',
		'click .reset': 'reset',
		'click .continue': 'continue',
		'click .step': 'step',
		'change #sample-select': 'loadSample'
	},

	render: function () {
		this.$el.empty().append(this.template());
		this.$('.editor').empty().append(this.editor.$el);
		this.$('.json-output').empty().append(this.jsonOutput.$el);
		this.$('.inspector').empty().append(this.inspector.$el);
		this.$('.memory').empty().append(this.memview.$el);
		this.redrawButtons();
	},

	compile: async function () {
		// Get .yo content directly (no assembly needed)
		var yoContent = this.editor.getSource();

		// Display the .yo content in object code view
		this.inspector.setObjectCode({
			obj: yoContent,
			errors: []
		});

		// Send directly to backend
		await INIT(yoContent);

		Backbone.Events.trigger('app:redraw');
		this.$('.continue span').text('Start');
	},

	reset: async function () {
			await RESET();
			this.$('.continue span').text('Start');

			Backbone.Events.trigger('app:redraw');
	},

	continue: async function () {
		if (IS_RUNNING()) {
			PAUSE();
		} else if (STAT === 'AOK' || STAT === 'DBG') {
			this.$('.continue span').text('Pause');
			this.$('.step').addClass('disabled');
			await RUN(this.triggerRedraw);
		}
	},

	step: async function () {
		if (!IS_RUNNING() && (STAT === 'AOK' || STAT === 'DBG')) {
			await STEP();
			Backbone.Events.trigger('app:redraw');
		}
	},

	triggerRedraw: function () {
		Backbone.Events.trigger('app:redraw');
	},

	redrawButtons: function () {
		if (STAT === 'AOK' || STAT === 'DBG') {
			this.$('.continue span').text('Continue');
			this.$('.step, .continue').removeClass('disabled');
		} else {
			this.$('.step, .continue').addClass('disabled');
		}
	},

	loadSample: async function () {
		var filename = this.$('#sample-select').val();
		if (!filename) {
			// User selected the default option, do nothing
			return;
		}

		try {
			// Fetch the sample file from the samples directory
			const response = await fetch('samples/' + filename);
			if (!response.ok) {
				throw new Error('Failed to load sample file: ' + filename);
			}
			const content = await response.text();

			// Set the editor content
			this.editor.setSource(content);

			console.log('Loaded sample file: ' + filename);
		} catch (error) {
			console.error('Error loading sample:', error);
			alert('Error loading sample file: ' + error.message);
		}
	}
});
