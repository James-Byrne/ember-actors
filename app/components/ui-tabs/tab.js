import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

import { inject as service } from '@ember/service';
import { next } from '@ember/runloop'
import { action } from '@ember/object';

import { Machine, sendParent } from 'xstate';

export const tabMachine = Machine({
  id: 'tab',
  initial: 'idle',
  on: {
    CLOSE: {
      actions: sendParent(context => ({ type: 'CLOSE_TAB', ...context }))
    },
    DESELECT: 'idle'
  },
  states: {
    idle: {
      on: {
        SELECT: {
          target: 'selected',
          actions: sendParent((c, e) => ({ type: 'TAB_SELECTED', tabId: e.id }))
        }
      }
    },
    selected: {}
  }
});

class XstateWrapper {
  @tracked state;

  constructor(state) {
    this.state = state.value;
  }

  get isSelected() {
    return this.state === 'selected';
  }
}

export default class TabComponent extends Component {
  @service tabs;

  @tracked tabMachine = tabMachine;
  @tracked tabState;

  get registerTab() {
    return this.args.registerTab ?? this.tabs.registerTab(this.args.tabContextId);
  }

  get getTabMachine() {
    return this.args.getTabMachine ?? this.tabs.getTabMachine(this.args.tabContextId);
  }

  constructor(owner, args) {
    super(owner, args);

    // register with the tabContext
    next(() => {
      // register the tab with the tabContext
      this.registerTab({
        tab: tabMachine,
        id: this.args.name,
        contentComponent: this.args.content
      });

      // get the newly created actor
      this.tabMachine = this.getTabMachine(this.args.name)?.actor;

      // when the actor changes state update the local tabState
      this.tabMachine.onTransition(state => this.tabState = new XstateWrapper(state));
    });
  }

  @action
  selectTab() {
    this.tabMachine.send('SELECT', { id: this.args.name });
  }
}
