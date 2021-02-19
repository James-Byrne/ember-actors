import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { next } from '@ember/runloop'

import { action } from '@ember/object';
import { inject as service } from '@ember/service';

import { Machine, assign, spawn, send, sendParent } from 'xstate';

const tabsMachine = Machine({
  initial: 'active',
  context: {
    tabs: [],
    selectedTabId: undefined,
    selectedTabContentComponent: undefined,
  },
  on: {
    REGISTER_ROUTABLE_TAB: [
      {
        cond: 'tabAlreadyRegistered'
      },
      {
        cond: 'noTabSelected',
        actions: [
          'spawnRoutableTab',
          'updateSelectedTab',
          'selectTab'
        ]
      },
      {
        actions: 'spawnRoutableTab'
      },
    ],
    REGISTER_TAB: [
      {
        cond: 'tabAlreadyRegistered'
      },
      {
        cond: 'noTabSelected',
        actions: [
          'spawnTab',
          'updateSelectedTab',
          'selectTab'
        ]
      },
      {
        actions: 'spawnTab'
      },
    ],
    SELECT_TAB: {
      actions: 'selectTab'
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
        ARCHIVE: {
          target: 'archived',
          actions: sendParent((c, e) => ({ type: 'ARCHIVE_TAB_CONTEXT', tabContextId: e.id }))
        },
        TAB_SELECTED: {
          actions: [
            'updateSelectedTab',
            'deselectTabs'
          ]
        }
      }
    },
    archived: {
      on: {
        WAKE: {
          target: 'active',
          actions: sendParent((c, e) => ({ type: 'TAB_CONTEXT_WOKE', tabContextId: e.id }))
        }
      }
    }
  }
}, {
  actions: {
    updateSelectedTab: assign({
      selectedTabId: (c, e) => e.tabId,
      selectedTabContentComponent: (c, e) => {
        const selectedTab = c.tabs.find(tab => tab.id === e.tabId);
        if (selectedTab) return selectedTab.content;
      }
    }),
    spawnTab: assign({
      tabs: (c, e) => [
        ...c.tabs,
        {
          id: e.tabId,
          actor: spawn(e.tab),
          content: e.contentComponent,
          routable: false
        }
      ]
    }),
    spawnRoutableTab: assign({
      tabs: (c, e) => [
        ...c.tabs,
        {
          id: e.tabId,
          name: e.name,
          label: e.label,
          actor: spawn(e.tab),
          content: e.contentComponent,
          routable: true
        }
      ]
    }),
    deselectTabs(c, e) {
      c.tabs.forEach(tab => {
        if (tab.id === e.tabId) return;
        tab.actor.send('DESELECT');
      })
    },
    selectTab: send(
      (c, e) => ({ type: 'SELECT', id: e.tabId }),
      {
        to: (c, e) => c.tabs.find(tab => tab.id === e.tabId)?.actor
      }
    )
  },
  guards: {
    noTabSelected(c) {
      return !c.selectedTabId;
    },
    tabAlreadyRegistered(c, e) {
      return c.tabs.find(tab => tab.id === e.tabId);
    }
  }
})

class XstateWrapper {
  @tracked currentState;
  @tracked context;

  constructor(state) {
    this.currentState = state.value;
    this.context = state.context;
  }

  get isArchived() {
    return this.currentState === 'archived';
  }

  get isActive() {
    return this.currentState === 'active';
  }
}

export default class UiTabsComponent extends Component {
  @service tabs;

  @tracked selectedTabContentComponent;
  @tracked tabContextMachine;
  @tracked tabContextState;

  constructor(owner, args) {
    super(owner, args);

    next(() => {
      // Register the new TabContext
      this.tabs.registerTabContext({
        tabContext: tabsMachine,
        id: this.args.name
      });

      // get the newly created actor
      this.tabContextMachine = this.tabs.getTabContext(this.args.name).actor;

      // when the actor changes state update the local tabContext state
      this.tabContextMachine.onTransition(
        state => this.tabContextState = new XstateWrapper(state)
      );
    });
  }

  willDestroy() {
    // Let the tabs service know we are archiving this tabContext
    this.tabContextMachine.send('ARCHIVE', { id: this.args.name });
  }

  get firstTab() {
    return this.tabContextState.context.tabs[0];
  }

  get selectedTabId() {
    return this.tabContextState.context.selectedTabId;
  }

  get routableTabs() {
    return this.tabContextState?.context.tabs.filter(t => t.routable) ?? [];
  }

  @action
  registerTab({ tab, id, contentComponent }) {
    this.tabContextMachine.send('REGISTER_TAB', { tab, tabId: id, contentComponent });
  }

  @action
  getTabMachine(tabId) {
    return this.tabContextState.context.tabs.find(tab => tab.id === tabId);
  }

  @action
  closeTab(tabId) {
    this.tabContextMachine.send('CLOSE_TAB', { tabId });
  }

  @action
  selectTab(tabId) {
    this.tabContextMachine.send('SELECT_TAB', { tabId });
  }

  @action
  selectFirstTab() {
    this.tabContextMachine.send('SELECT_TAB', {
      tabId: this.firstTab.id
    });
  }
}
