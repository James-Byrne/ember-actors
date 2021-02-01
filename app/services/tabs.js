import Service from '@ember/service';

import { Machine, send, assign, spawn } from 'xstate';
import { useMachine, interpreterFor } from 'ember-statecharts';

// @ts-ignore
import { use } from 'ember-usable';

const tabServiceMachine = Machine({
  id: 'tabsService',
  initial: 'idle',
  context: {
    tabContexts: []
  },
  on: {
    ARCHIVE_TAB_CONTEXT: {
      actions: send('ARCHIVE', {
        to:  (_, e) => e.tabContextId
      }),
    },
    REGISTER_TAB_CONTEXT: [
      {
        cond: 'contextIsArchived',
        actions: send('WAKE', {
          to: (_, e) => e.tabContextId
        })
      },
      {
        actions: assign({
          tabContexts: (c, e) => [
            ...c.tabContexts,
            spawn(e.tabContext, e.tabContextId)
          ]
        })
      }
    ]
  },
  states: {
    idle: {}
  }
}, {
  guards: {
    contextIsArchived() {
      // check if the context is archived
      return false;
    }
  }
});


export default class TabsService extends Service {
  @use statechart = useMachine(tabServiceMachine);

  get machine() {
    return interpreterFor(this.statechart);
  }

  get machineContext() {
    return this.machine.state.context;
  }

  getTabContext(tabContextId) {
    return this.machineContext.tabContexts.find(tc => {
      return tc.id === tabContextId
    });
  }

  getTab(tabContextId, tabId) {
    const tabContext = this.getTabContext(tabContextId);

    // placeholder
    return { tabContext, tabId };
  }

  removeTab(tabContextId, tabId) {
    return this.machine.send('REMOVE_TAB', {
      tabContextId: tabContextId,
      tabId: tabId
    });
  }

  registerTabContext(tabContext, tabContextId) {
    return this.machine.send('REGISTER_TAB_CONTEXT', {
      tabContext,
      tabContextId
    });
  }

  archiveTabContext(tabContextId) {
    return this.machine.send('ARCHIVE_TAB_CONTEXT', {
      tabContextId
    });
  }

  send(...args) {
    return this.machine.send(...args);
  }
}
