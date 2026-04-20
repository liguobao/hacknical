/* eslint new-cap: "off" */

import React from 'react'
import cx from 'classnames'
import CalHeatmap from 'cal-heatmap'
import 'cal-heatmap/cal-heatmap.css'
import { Loading, InfoCard, CardGroup } from 'light-ui'
import styles from '../styles/github.css'
import cardStyles from '../styles/info_card.css'
import locales, { formatLocale } from 'LOCALES'
import dateHelper from 'UTILS/date'
import Icon from 'COMPONENTS/Icon'

const githubTexts = locales('github.sections.hotmap')
const HOTMAP_COLORS = ['#ededed', '#dae289', '#8cc665', '#44a340', '#3b6427']

const normalizeHotmapData = (datas = {}) => Object.keys(datas).map(timestamp => ({
  date: Number(timestamp) * 1000,
  value: datas[timestamp]
}))

const getScaleThresholds = (levelRanges = [], hotmapData = []) => {
  const thresholdCount = HOTMAP_COLORS.length - 1
  const normalizedRanges = levelRanges
    .slice(1)
    .map(level => Number(level))
    .filter(level => Number.isFinite(level) && level > 0)
    .sort((left, right) => left - right)

  if (normalizedRanges.length >= thresholdCount) {
    return normalizedRanges.slice(0, thresholdCount)
  }

  const maxValue = Math.max(
    thresholdCount,
    ...hotmapData.map(item => Number(item.value) || 0)
  )

  return Array.from({ length: thresholdCount }, (_, index) =>
    Math.max(index + 1, Math.ceil(((index + 1) * maxValue) / thresholdCount))
  )
}

class Hotmap extends React.Component {
  constructor(props) {
    super(props)
    this.githubCalendar = null
    this.hotmapRoot = null
    this.handleNext = this.handleNext.bind(this)
    this.handlePrevious = this.handlePrevious.bind(this)
    this.setHotmapRoot = this.setHotmapRoot.bind(this)
  }

  componentDidMount() {
    if (this.props.loaded) {
      this.renderHotmap()
    }
  }

  componentDidUpdate(preProps) {
    const { loaded, data } = this.props

    if (
      loaded
      && (!this.githubCalendar || loaded !== preProps.loaded || data !== preProps.data)
    ) {
      this.renderHotmap()
    }
  }

  componentWillUnmount() {
    if (this.githubCalendar) {
      this.githubCalendar.destroy()
      this.githubCalendar = null
    }
  }

  setHotmapRoot(ref) {
    this.hotmapRoot = ref
  }

  handlePrevious() {
    if (this.githubCalendar) {
      this.githubCalendar.previous()
    }
  }

  handleNext() {
    if (this.githubCalendar) {
      this.githubCalendar.next()
    }
  }

  async renderHotmap() {
    const { loaded, data } = this.props
    if (!loaded || !this.hotmapRoot) return

    const local = formatLocale()
    const {
      datas = {},
      levelRanges = []
    } = (data || {})
    const hotmapData = normalizeHotmapData(datas)
    const thresholds = getScaleThresholds(levelRanges, hotmapData)
    const startTimestamp = hotmapData.length
      ? Math.min(...hotmapData.map(item => item.date))
      : new Date(dateHelper.date.beforeYears(1)).getTime()
    const endTimestamp = hotmapData.length
      ? Math.max(...hotmapData.map(item => item.date))
      : Date.now()

    if (this.githubCalendar) {
      await this.githubCalendar.destroy()
    }

    const calendar = new CalHeatmap()
    this.githubCalendar = calendar

    await calendar.paint({
      itemSelector: this.hotmapRoot,
      range: 13,
      domain: {
        type: 'month',
        gutter: 4
      },
      subDomain: {
        type: 'ghDay',
        width: 11,
        height: 11,
        gutter: 4,
        radius: 2
      },
      date: {
        start: new Date(startTimestamp),
        min: new Date(startTimestamp),
        max: new Date(endTimestamp),
        locale: local === 'zh-CN' ? { weekStart: 1 } : 'en'
      },
      data: {
        source: hotmapData,
        x: 'date',
        y: 'value',
        defaultValue: 0
      },
      scale: {
        color: {
          type: 'threshold',
          range: HOTMAP_COLORS,
          domain: thresholds
        }
      }
    })
  }

  renderCardGroup() {
    const { renderCards, data } = this.props
    if (!data || !data.datas || !renderCards) return null
    const {
      end,
      start,
      total,
      streak,
    } = data

    return (
      <CardGroup
        className={cx(
          cardStyles.card_group,
          styles.hotmapCards
        )}
      >
        <CardGroup>
          <InfoCard
            icon="terminal"
            tipsoTheme="dark"
            mainText={total}
            subText={githubTexts.total}
            tipso={{
              text: `${start} ~ ${end}`
            }}
          />
          <InfoCard
            tipsoTheme="dark"
            mainText={`${streak.weekly.start}~${streak.weekly.end}`}
            subText={githubTexts.weekly}
            tipso={{
              text: `Totally ${streak.weekly.count} commits`
            }}
          />
        </CardGroup>
        <CardGroup>
          <InfoCard
            tipsoTheme="dark"
            mainText={streak.daily.date}
            subText={githubTexts.daily}
            tipso={{
              text: `${streak.daily.count} commits`
            }}
          />
          <InfoCard
            icon="thumb-tack"
            tipsoTheme="dark"
            mainText={streak.longest.count}
            subText={githubTexts.longestStreak}
            tipso={{
              text: streak.longest.start
                ? `${streak.longest.start} ~ ${streak.longest.end}`
                : githubTexts.streakError
            }}
          />
          <InfoCard
            tipsoTheme="dark"
            mainText={streak.current.count}
            subText={githubTexts.currentStreak}
            tipso={{
              text: streak.current.start
                ? `${streak.current.start} ~ ${streak.current.end}`
                : githubTexts.streakError
            }}
          />
        </CardGroup>
      </CardGroup>
    )
  }

  render() {
    const { className, loaded } = this.props

    return (
      <div
        className={cx(
          styles.githubCalendar,
          className
        )}
      >
        <Loading className={styles.loading} loading={!loaded} />
        <div ref={this.setHotmapRoot} className={styles.githubHotmap} />
        <div className={styles.hotmapControllers}>
          <div
            className={styles.hotmapController}
            id="hotmap-left"
            onClick={this.handlePrevious}
          >
            <Icon icon="angle-left" />
          </div>
          <div
            className={styles.hotmapController}
            id="hotmap-right"
            onClick={this.handleNext}
          >
            <Icon icon="angle-right" />
          </div>
        </div>
        {this.renderCardGroup()}
      </div>
    )
  }
}

Hotmap.defaultProps = {
  login: '',
  className: '',
  renderCards: true,
  data: {
    end: '',
    start: '',
    total: '',
    streak: '',
    datas: {},
    levelRanges: []
  }
}

export default Hotmap
