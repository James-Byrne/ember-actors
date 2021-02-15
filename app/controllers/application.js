import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';

import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class ApplicationController extends Controller {
  @service tabs;

  @tracked showListings = true;
  @tracked showSearchOrders = true;

  @action
  toggleShowListings() {
    this.showListings = !this.showListings;
  }

  @action
  toggleSearchOrders() {
    this.showSearchOrders = !this.showSearchOrders;
  }

  @action
  archiveTabContext(tabContextId) {
    return this.tabs.archiveTabContext(tabContextId);
  }
}
