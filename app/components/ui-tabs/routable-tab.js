import Component from '@glimmer/component';

import { tabMachine } from './tab';

import { inject as service } from '@ember/service';
import { next } from '@ember/runloop'

export default class TabComponent extends Component {
  @service tabs;

  constructor(owner, args) {
    super(owner, args);

    // register with the tabContext
    next(() => {
      // register the tab with the tabContext
      this.tabs.registerRoutableTab({
        tabId: this.args.name,
        label: this.args.label ?? this.args.name,
        tabContextId: this.args.tabContextId,
        contentComponent: this.args.content,
        tab: tabMachine,
        route: this.args.route
      });
    });
  }
}
