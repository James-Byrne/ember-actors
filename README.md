# Ember & Actors

This repo is a demonstration of how to use the Actor model in conjunction with glimmer components. The Machines, of which there are three, are used to model the systems behaviour and in some cases persist state. The components orchestrate the setup of machines & send messages to their machines in reaction to events such as component teardown or user input. They also take charge of DOM interactions such as displaying the state of a machine.

## Services

### `TabsService`

This service has two objectives, provide an api for interacting with a `TabContext` from outside that context (i.e. close a tab when `x` occurs) and maintain a memory of all `TabContext`s that have been instantiated & their state.

## Components

### `<UiTabs>`

This is the base component that we will use to create a tab bar & manage the lifecycle of our tabs. It's main role is to host a `TabContext` machine and to render the tab bar itself. It yields a hash that includes `actions`, `state` & `ui` (aka tabs or routable tabs) which we then use to build the tabs themselves.

> Note that without the demonstration html here & with a `UiTabs::TabBar` component this component could be a simple provider rendering no html of its own

### `<UiTabs::Tab>`

This is the tab component which we see rendered within the tab bar. It manages registering a new `TabMachine` (an actor) with the `TabContextMachine` and displays the current state of the tab. For example if it is currently selected or not.

### `<UiTabs::RoutableTab>`

This tab component is used to spawn tabs when we don't have a direct link to the `TabContext`. In order to do this it will create a `TabMachine` (the same machine as from `<UiTabs::Tab>`) and use the `TabsService` to register the `TabMachine` with a given `TabContextMachine`. The `UiTabs` component will then render a `<UiTabs::Tab/>` component with all the same parameters & content that we specified when declaring the routable tab.

## Machines

Three machines are used to manage the state & interactions between the different components mentioned above. They also act as a demonstration of the Actor model and how we can use it to manage or enhance our ember components and services.

For this application the hierarchy of machines is as follows, where each machine `hasMany` of the following machine:

```
TabsMachine -> TabContextMachine -> TabsMachine
```

You may notice that two of the machines (`TabContextMachine` & `TabMachine`) do not use `ember-statecharts` or `useMachine`. This is due to how xstate manages the relations between Parent & Child actors. Put briefly, when a `Machine` is interpreted it will lose it's connection to it's parent, the parent will still maintain a `ref` to it's children but communication from Child to Parent is not possible.

Since `useMachine` will call `interpret` on a `Machine` passed to it we can't use it here and instead rely on plain `xstate` for the `TabContextMachine` & `TabsMachine`.

### TabsMachine

This machine is the supervisor for all `TabContextMachine`s. Each `TabContextMachine` is registered as a child of this machine so the two can communicate. This is useful for a number of operations such as:

- Registering routable tabs
  - Where we don't have access to the `<UiTabs/>` instance
- Actions at a distance, i.e. opening or closing tabs
  - The service acts as a layer between all instances of `<UiTabs>` and the rest of the application
- Remembering the state of `UiTabs` that have been torn down
  - By registering the `TabContextMachine`s as children of a service we are able to remember the previous state of a `UiTabs` instance, i.e. the last open tab

In particular here the Actor model allows us to store the state of individual `UiTabs` instances as long lived machines independent of the components & their lifecycles.

Using the Actor model allows us to store the state of individual `UiTabs` instances as long lived machines independent of the components and their lifecycles. In doing this we allow the machines to take care of the behaviour of the components while the components manage the lifecycle & rendering (i.e. DOM) aspects. This allows both side (xstate & glimmer) to play to their strenghts while keeping things clear for us.

### TabContextMachine

This machine is used to manage a list of `TabMachine`s and interact with it's parent `TabsMachine`. When an instance of `UiTabs` is rendered it will immediately create & register a new `TabContextMachine` with the `TabsService` and then retrieve that newly created machine.

> If the machine already exists a new machine will not be created and the existing machine will be awoken for use

From there we can register instances of `UiTabs::Tab` as children of the `TabContextMachine` and select or close tabs. For instance when a tab is selected the `TabMachine` will send a `SELECT_TAB` event to it's `TabContextMachine`, which will in turn send a `DESELECT` event to all other children. Hence only tab is selected at a time.

In the case of routable tabs a message will be sent to the `TabsMachine` which will be forwarded to the relevant `TabContextMachine` and a new tab will be added with `routable: true`.

### TabMachine

This machine encapsulates the basic behaviour of the `<UiTabs::Tab>` component. It can tell if the tab is selected and inform it's parent if it becomes selected. This will then in turn prompt the parent to tell all other child tabs to move to the `idle` state.

---

## Prerequisites

You will need the following things properly installed on your computer.

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/)
- [Yarn](https://yarnpkg.com/)
- [Ember CLI](https://ember-cli.com/)
- [Google Chrome](https://google.com/chrome/)

## Installation

- `git clone <repository-url>` this repository
- `cd ember-actors`
- `yarn install`

## Running / Development

- `ember serve`
- Visit your app at [http://localhost:4200](http://localhost:4200).
- Visit your tests at [http://localhost:4200/tests](http://localhost:4200/tests).

### Code Generators

Make use of the many generators for code, try `ember help generate` for more details

### Running Tests

- `ember test`
- `ember test --server`

### Linting

- `yarn lint:hbs`
- `yarn lint:js`
- `yarn lint:js --fix`

### Building

- `ember build` (development)
- `ember build --environment production` (production)

### Deploying

Specify what it takes to deploy your app.

## Further Reading / Useful Links

- [ember.js](https://emberjs.com/)
- [ember-cli](https://ember-cli.com/)
- Development Browser Extensions
  - [ember inspector for chrome](https://chrome.google.com/webstore/detail/ember-inspector/bmdblncegkenkacieihfhpjfppoconhi)
  - [ember inspector for firefox](https://addons.mozilla.org/en-US/firefox/addon/ember-inspector/)
