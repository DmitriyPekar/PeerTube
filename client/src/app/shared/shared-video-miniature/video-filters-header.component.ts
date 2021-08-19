import * as debug from 'debug'
import { Subscription } from 'rxjs'
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core'
import { FormBuilder, FormGroup } from '@angular/forms'
import { AuthService } from '@app/core'
import { ServerService } from '@app/core/server/server.service'
import { UserRight } from '@shared/models'
import { NSFWPolicyType } from '@shared/models/videos'
import { PeertubeModalService } from '../shared-main'
import { VideoFilters } from './video-filters.model'

const logger = debug('peertube:videos:VideoFiltersHeaderComponent')

@Component({
  selector: 'my-video-filters-header',
  styleUrls: [ './video-filters-header.component.scss' ],
  templateUrl: './video-filters-header.component.html'
})
export class VideoFiltersHeaderComponent implements OnInit, OnDestroy {
  @Input() filters: VideoFilters

  @Input() displayModerationBlock = false

  @Input() defaultSort = '-publishedAt'
  @Input() nsfwPolicy: NSFWPolicyType

  @Output() filtersChanged = new EventEmitter()

  areFiltersCollapsed = true

  form: FormGroup

  private routeSub: Subscription

  constructor (
    private auth: AuthService,
    private serverService: ServerService,
    private fb: FormBuilder,
    private modalService: PeertubeModalService
  ) {
  }

  ngOnInit () {
    this.form = this.fb.group({
      sort: [ '' ],
      nsfw: [ '' ],
      languageOneOf: [ '' ],
      categoryOneOf: [ '' ],
      scope: [ '' ],
      allVideos: [ '' ],
      live: [ '' ]
    })

    this.patchForm(false)

    this.filters.onChange(() => {
      this.patchForm(false)
    })

    this.form.valueChanges.subscribe(values => {
      logger('Loading values from form: %O', values)

      this.filters.load(values)
      this.filtersChanged.emit()
    })
  }

  ngOnDestroy () {
    if (this.routeSub) this.routeSub.unsubscribe()
  }

  canSeeAllVideos () {
    if (!this.auth.isLoggedIn()) return false
    if (!this.displayModerationBlock) return false

    return this.auth.getUser().hasRight(UserRight.SEE_ALL_VIDEOS)
  }

  isTrendingSortEnabled (sort: 'most-viewed' | 'hot' | 'best' | 'most-liked') {
    const serverConfig = this.serverService.getHTMLConfig()

    const enabled = serverConfig.trending.videos.algorithms.enabled.includes(sort)

    // Best is adapted from the user
    if (sort === 'best') return enabled && this.auth.isLoggedIn()

    return enabled
  }

  resetFilter (key: string, canRemove: boolean) {
    if (!canRemove) return

    this.filters.reset(key)
    this.patchForm(false)
    this.filtersChanged.emit()
  }

  getFilterTitle (canRemove: boolean) {
    if (canRemove) return $localize`Remove this filter`

    return ''
  }

  onAccountSettingsClick (event: Event) {
    if (this.auth.isLoggedIn()) return

    event.preventDefault()
    event.stopPropagation()

    this.modalService.openQuickSettingsSubject.next()
  }

  private patchForm (emitEvent: boolean) {
    const defaultValues = this.filters.toFormObject()
    this.form.patchValue(defaultValues, { emitEvent })

    logger('Patched form: %O', defaultValues)
  }
}
