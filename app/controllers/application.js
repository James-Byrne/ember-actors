import Controller from '@ember/controller';

import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class ApplicationController extends Controller {
  @service tabs;

  @action
  archiveTabContext(tabContextId) {
    return this.tabs.archiveTabContext(tabContextId);
  }
}
