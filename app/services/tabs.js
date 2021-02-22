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
    REGISTER_ROUTABLE_TAB: {
      cond: 'contextExists',
      actions: send((_, e) => ({ ...e, type: 'REGISTER_ROUTABLE_TAB' }), {
        to: (c, e) => c.tabContexts.find(t => t.id === e.tabContextId).actor
      })
    },
    ARCHIVE_TAB_CONTEXT: {
      actions: 'archiveTabContext',
    },
    TAB_CONTEXT_WOKE: {
      actions: 'setTabContextAwake',
    },
    REGISTER_TAB_CONTEXT: [
      {
        cond: 'contextDoesNotExist',
        actions: [
          assign({
            tabContexts: (c, e) => [
              ...c.tabContexts,
              {
                id: e.tabContextId,
                isArchived: false,
                actor: spawn(e.tabContext, e.tabContextId)
              }
            ]
          })
        ]
      },
      {
        cond: 'contextIsArchived',
        actions: send(
          (c, e) => ({ type: 'WAKE', id: e.tabContextId }),
          {
            to: (c, e) =>
              c.tabContexts.find(tc => tc.id === e.tabContextId).actor
          }
        )
      },
    ]
  },
  states: {
    idle: {}
  }
}, {
  actions: {
    setTabContextAwake:  assign({
      tabContexts: ({ tabContexts }, event) =>
        tabContexts.map(tc => {
          if (tc.id !== event.tabContextId) return tc;
          tc.isArchived = false;
          return tc;
        })
    }),
    archiveTabContext: assign({
      tabContexts: ({ tabContexts }, event) =>
        tabContexts.map(tc => {
          if (tc.id !== event.tabContextId) return tc;
          tc.isArchived = true;
          return tc;
        })
    })
  },
  guards: {
    contextIsArchived(context, event) {
      const tabContext = context.tabContexts.find(tc => tc.id === event.tabContextId);
      return tabContext.isArchived;
    },
    contextExists(context, event) {
      return context.tabContexts.find(tc => tc.id === event.tabContextId);
    },
    contextDoesNotExist(context, event) {
      return !context.tabContexts.find(tc => tc.id === event.tabContextId);
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
    return this.machineContext.tabContexts.find(tc => tc.id === tabContextId);
  }

  removeTab(tabContextId, tabId) {
    return this.machine.send('REMOVE_TAB', {
      tabContextId: tabContextId,
      tabId: tabId
    });
  }

  registerTabContext({ tabContext, id }) {
    return this.machine.send('REGISTER_TAB_CONTEXT', {
      tabContext,
      tabContextId: id
    });
  }

  archiveTabContext(tabContextId) {
    return this.machine.send('ARCHIVE_TAB_CONTEXT', {
      tabContextId
    });
  }

  registerRoutableTab(routableTabSpec) {
    this.machine.send('REGISTER_ROUTABLE_TAB', routableTabSpec);
  }

  send(...args) {
    return this.machine.send(...args);
  }
}
