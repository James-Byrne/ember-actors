import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

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
    tabs: [],
  },
  on: {
    REGISTER_TAB: [
      {
        cond: 'tabAlreadyRegistered'
      },
      {
        actions: assign({
          tabs: (c, e) => [
            ...c.tabs,
            {
              id: e.tabId,
              actor: spawn(e.tab),
              content: e.contentComponent
            }
          ]
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
          actions: [
            'updateSelectedTabContent',
            'deselectTabs'
          ]
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

  @tracked selectedTabContentComponent;

  @use statechart = useMachine(tabsMachine)
    .withConfig({
      actions: {
        updateSelectedTabContent: (c, e) => {
          const selectedTab = c.tabs.find(tab => tab.id === e.tabId);
          if (selectedTab) this.selectedTabContentComponent = selectedTab.content;
        }
      }
    });

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
  registerTab({ tab, id, contentComponent }) {
    this.machine.send('REGISTER_TAB', { tab, tabId: id, contentComponent });
  }

  @action
  getTabMachine(tabId) {
    return this.machine.state.context.tabs.find(tab => tab.id === tabId);
  }

  @action
  closeTab(tabId) {
    this.machine.send('CLOSE_TAB', { tabId });
  }

  @action
  selectTab(tabId) {
    this.machine.send('SELECT_TAB', { tabId });
  }
}
