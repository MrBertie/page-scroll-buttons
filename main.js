const { Plugin, PluginSettingTab, MarkdownView, Setting, setIcon } = require('obsidian');

const PAGE_SCROLL = 'page-scroll';

const Icon = {
	top: 'lucide-arrow-up-to-line',
	up: 'lucide-arrow-up',
	down: 'lucide-arrow-down',
	bottom: 'lucide-arrow-down-to-line',
};

const Lang = {
	overlapOptions: {
		100: '100px',
		90: '90px',
		80: '80px',
		70: '70px',
		60: '60px',
		50: '50px',
		40: '40px',
		30: '30px',
		20: '20px',
		10: '10px',
		0: '0px',
	},
	spacingOptions: {
		4: '4px',
		8: '8px',
		12: '12px',
		16: '16px',
		24: '24px',
		32: '32px',
		40: '40px',
	},
	sizeOptions: {
		16: '16px',
		20: '20px',
		24: '24px',
		28: '28px',
		32: '32px',
		40: '40px',
		48: '48px',
		56: '56px',
	},
	startOptions: {
		30: '30%',
		40: '40%',
		50: '50%',
		60: '60%',
		70: '70%',
	},
};

const Mode = {
	top: 'top',
	up: 'up',
	down: 'down',
	bottom: 'bottom',
};

const DEFAULT_SETTINGS = {
	start: 50, // vertical position of middle of the button group, on mobile, %
	startPC: 20, // vertical position of bottom of button group on desktop
	overlap: 60, // amount of visible overlap of previous page
	spacing: 12, // spacing gap between buttons, px
	size: 32, // size of buttons, px
	right: 16, // spacing from the right of window edge, on mobile, px
	rightPC: 8, // spacing from right of window edge, on desktop, px
};

class PageScrollPlugin extends Plugin {
	constructor() {
		super(...arguments);
		this.settings = {};
	}

	async onload() {
		await this.loadSettings();

		this.registerButtons();

		this.addSettingTab(new PageScrollTab(this.app, this));

		console.log(
			`%c${this.manifest.name} ${this.manifest.version} loaded`,
			'background-color: chocolate; padding:4px; border-radius:4px',
		);
	}

	onunload() {
		this.clearAllButtons();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	scroll(mode) {
		const thisView = this.app.workspace.getActiveViewOfType(MarkdownView);
		let scrollEl;
		if (thisView?.getMode() === 'preview') {
			scrollEl = thisView.previewMode?.renderer?.previewEl;
		} else {
			scrollEl = thisView.editMode?.cm?.scrollDOM;
		}
		if (!scrollEl) {
			scrollEl = this.app.workspace.getActiveFileView()?.containerEl?.children[1];
		}

		if (scrollEl) {
			const range = scrollEl.clientHeight - this.settings.overlap;
			switch (mode) {
				case Mode.top:
					scrollEl.scroll(0, 0);
					break;
				case Mode.up:
					scrollEl.scrollBy(0, -range);
					break;
				case Mode.down:
					scrollEl.scrollBy(0, range);
					break;
				case Mode.bottom:
					scrollEl.scroll(0, scrollEl.scrollHeight);
					break;
			}
		}
	}

	registerButtons() {
		const isMobile = this.app.isMobile;
		const right = isMobile ? this.settings.right : this.settings.rightPC;
		const step = this.settings.spacing + this.settings.size;
		const startPC = this.settings.startPC;
		const start = isMobile ? `${this.settings.start}%` : `${startPC}px`;
		const bottom = isMobile ? -(step * 3 + this.settings.size) / 2 : startPC;
		this.registerButton(Mode.top, Icon.top, step * 3 + bottom, right, start);
		this.registerButton(Mode.up, Icon.up, step * 2 + bottom, right, start);
		this.registerButton(Mode.down, Icon.down, step + bottom, right, start);
		this.registerButton(Mode.bottom, Icon.bottom, bottom, right, start);
	}

	registerButton(mode, icon, offsetBottom, offsetRight, offsetStart) {
		const buttonId = `${PAGE_SCROLL}-${mode}`;
		if (!document.getElementById(buttonId)) {
			const button = createEl('div');
			button.className = `${PAGE_SCROLL} clickable-icon`;
			button.style.bottom = `calc(${offsetStart} + ${offsetBottom}px)`;
			button.style.right = `${offsetRight}px`;
			button.style.width = `${this.settings.size}px`;
			button.style.height = `${this.settings.size}px`;
			setIcon(button, icon);
			button.onclick = () => this.scroll(mode);
			this.app.workspace.containerEl.appendChild(button);
		}
	}

	clearAllButtons() {
		for (const button of document.querySelectorAll(`.${PAGE_SCROLL}`)) {
			button.remove();
		}
	}
}

class PageScrollTab extends PluginSettingTab {
	constructor(app, plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		const { containerEl } = this;

		containerEl.empty();
		containerEl.addClass('page-scroll-settings');

		const refresh = () => {
			this.plugin.clearAllButtons();
			this.plugin.registerButtons();
		};

		new Setting(containerEl)
			.setName('Overlap')
			.setDesc('How much of the previous/next page should remain visible')
			.addDropdown((dropdown) => {
				dropdown
					.addOptions(Lang.overlapOptions)
					.setValue(String(this.plugin.settings.overlap))
					.onChange(async (value) => {
						this.plugin.settings.overlap = Number(value);
						await this.plugin.saveSettings();
						refresh();
					});
			});

		new Setting(containerEl)
			.setName('Size')
			.setDesc('The size of the scroll buttons')
			.addDropdown((dropdown) => {
				dropdown
					.addOptions(Lang.sizeOptions)
					.setValue(String(this.plugin.settings.size))
					.onChange(async (value) => {
						this.plugin.settings.size = Number(value);
						await this.plugin.saveSettings();
						refresh();
					});
			});

		new Setting(containerEl)
			.setName('Spacing')
			.setDesc('The spacing between the scroll buttons')
			.addDropdown((dropdown) => {
				dropdown
					.addOptions(Lang.spacingOptions)
					.setValue(String(this.plugin.settings.spacing))
					.onChange(async (value) => {
						this.plugin.settings.spacing = Number(value);
						await this.plugin.saveSettings();
						refresh();
					});
			});

		new Setting(containerEl)
			.setName('Centred at')
			.setDesc('Vertical position of the centre of button group (50% = halfway)')
			.addDropdown((dropdown) => {
				dropdown
					.addOptions(Lang.startOptions)
					.setValue(String(this.plugin.settings.start))
					.onChange(async (value) => {
						this.plugin.settings.start = Number(value);
						await this.plugin.saveSettings();
						refresh();
					});
			});

		new Setting(containerEl)
			.setName('Reset to default')
			.setDesc('Return all settings to their original defaults.')
			.addButton((btn) => {
				btn.setIcon('reset');
				btn.onClick(async () => {
					Object.assign(this.plugin.settings, DEFAULT_SETTINGS);
					await this.plugin.saveSettings();
					this.display();
					refresh();
				});
			});
	}
}

module.exports = {
	default: PageScrollPlugin,
};
