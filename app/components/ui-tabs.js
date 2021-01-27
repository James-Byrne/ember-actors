import Component from '@glimmer/component';

import { action } from '@ember/object';
import { inject as service } from '@ember/service';

import { Machine, assign, spawn, send } from 'xstate';
import { useMachine, interpreterFor, matchesState } from 'ember-statecharts';

// @ts-ignore
import { use } from 'ember-usable';

const tabsMachine = Machine({
  id: 'search-orders',
  initial: 'active',
  context: {
    tabs: []
  },
  on: {
    REGISTER_TAB: [
      {
        cond: 'tabAlreadyRegistered'
      },
      {
        actions: assign({
          tabs: (c, e) => [...c.tabs, { id: e.tabId, actor: spawn(e.tab) }]
        })
      },
    ],
    SELECT_TAB: {
      actions: [
        send(
          (c, e) => ({ type: 'SELECT', id: e.tabId }),
          {
            to: (c, e) => c.tabs.find(tab => tab.id === e.tabId).actor
          }
        )
      ]
    },
    CLOSE_TAB: assign({
      tabs: (c, e) => {
        return c.tabs.reduce((acc, tab) => {
          if (tab.id  === e.tabId) return acc;
          return [...acc, tab];
        }, []);
      }
    })
  },
  states: {
    active: {
      on: {
        ARCHIVE: 'archived',
        TAB_SELECTED: {
          actions: 'deselectTabs'
        }
      }
    },
    archived: {
      on: {
        WAKE: 'active'
      }
    }
  }
}, {
  actions: {
    deselectTabs(c, e) {
      console.log('deselectTabs', { c, e });

      c.tabs.forEach(tab => {
        if (tab.id === e.tabId) return;
        tab.actor.send('DESELECT');
      })
    }
  },
  guards: {
    tabAlreadyRegistered(c, e) {
      return c.tabs.find(tab => tab.id === e.tabId);
    }
  }
})

export default class UiTabsComponent extends Component {
  @service tabs;

  @use statechart = useMachine(tabsMachine);
    // .onTransition((...args) => console.log('ui-tabs > onTransition', args))
    // .update((...args) => console.log('ui-tabs > update', args));

  @matchesState('archived') isArchived;
  @matchesState('active') isActive;

  constructor(owner, args) {
    super(owner, args);

    // Register the new TabContext
    this.tabs.registerTabContext(this.statechart.service, this.args.name);
  }

  get machine() {
    return interpreterFor(this.statechart);
  }

  // for testing only
  @action
  wakeTabContext() {
    this.machine.send('WAKE');
  }

  @action
  registerTab(tab, tabId) {
    this.machine.send('REGISTER_TAB', { tab, tabId });
  }

  @action
  getTabMachine(tabId) {
    // console.log('getTabMachine', this.machine.state.context.tabs.find(tab => tab.id === tabId));
    return this.machine.state.context.tabs.find(tab => tab.id === tabId);
  }

  @action
  closeTab(tabId) {
    this.machine.send('CLOSE_TAB', { tabId });
  }

  @action
  selectTab(tabId) {
    console.log('selectTab', tabId);
    this.machine.send('SELECT_TAB', { tabId });
  }
}
