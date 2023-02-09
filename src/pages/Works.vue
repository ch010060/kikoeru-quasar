<template>
  <div>
    <RecentList />

    <div class="text-h5 text-weight-regular q-ma-md">
      {{pageTitle}}
      <span v-show="pagination.totalCount">
        ({{pagination.totalCount}})
      </span>
    </div>

    <div :class="`row justify-center ${displayMode === 'list' ? 'list' : 'q-mx-md'}`">
      <q-infinite-scroll @load="onLoad" :offset="250" :disable="stopLoad" class="col">
        <div v-show="works.length" class="row justify-between q-mb-md q-mr-sm">
          <!-- 排序选择框 -->
          <q-select
            dense
            rounded
            outlined
            :bg-color="color"
            transition-show="scale"
            transition-hide="scale"
            v-model="sortOption"
            :options="options"
            label="排序"
            class="col-auto"
          />

          <q-checkbox v-model="subtitleOnly" label="带字幕" class="row" @input="subtitleFilter()"></q-checkbox>

          <!-- 切换显示模式按钮 -->
          <q-btn-toggle
            dense
            spread
            rounded
            v-model="displayMode"
            toggle-color="primary"
            color="white"
            text-color="primary"
            :options="[
              { icon: 'view_module', value: 'thumbnail' },
              { icon: 'view_column', value: 'detail'},
              { icon: 'list', value: 'list' }
            ]"
            style="width: 85px;"
            class="col-auto"
          />
        </div>

        <q-list v-if="displayMode === 'list'" bordered separator class="shadow-2">
          <WorkListItem v-for="work in works" :key="work.id" :metadata="work" :showLabel=true />
        </q-list>

        <div v-else class="row q-col-gutter-x-md q-col-gutter-y-lg">
          <div class="col-xs-12 col-sm-6 col-md-4" :class="displayMode === 'detail' ? 'col-lg-3 col-xl-3': 'col-lg-2 col-xl-2'" v-for="work in works" :key="work.id">
            <WorkCard :metadata="work" :thumbnailMode="displayMode === 'thumbnail'" class="fit"/>
          </div>
        </div>

        <div v-show="stopLoad" class="q-mt-lg q-mb-xl text-h6 text-bold text-center">END</div>

        <!-- loading -->
        <div class="row justify-center q-my-md" v-show="loading">
          <q-spinner-dots color="primary" size="40px"/>
        </div>

        <!-- 分页 -->
        <div class="q-py-lg flex flex-center">
          <Pagination
            show-quick-jumper
            :class="this.$q.dark.isActive ? 'dark' : ''"
            v-model="page"
            :pageSize="pagination.pageSize"
            :total="pagination.totalCount"
            :itemRender="paginationItemRender"
          />
        </div>
      </q-infinite-scroll>
    </div>
  </div>
</template>

<script>
import WorkCard from 'components/WorkCard'
import WorkListItem from 'components/WorkListItem'
import NotifyMixin from '../mixins/Notification.js'
import RecentList from 'components/RecentList'
import {EventBus} from '../utils/EventBus.js'
import DarkMode from '../mixins/DarkMode'
import {isPrerender} from "src/utils/prerender";

export default {
  name: 'Works',

  mixins: [NotifyMixin,DarkMode],

  components: {
    WorkCard,
    WorkListItem,
    RecentList
  },

  data () {
    return {
      displayMode: isPrerender() ? 'thumbnail' : 'detail',
      showLabel: true,
      detailMode: true,
      stopLoad: false,
      works: [],
      pageTitle: '',
      page: 1,
      pagination: { currentPage:0, pageSize:12, totalCount:0 },
      seed: 7, // random sort
      subtitleOnly: false,
      sortOption: {
        label: '最新收錄',
        order: 'insert_time',
        sort: 'desc'
      },
      options: [
        {
          label: '最新收錄',
          order: 'insert_time',
          sort: 'desc'
        },
        {
          label: '發售日新到舊',
          order: 'release',
          sort: 'desc'
        },
        {
          label: '發售日舊到新',
          order: 'release',
          sort: 'asc'
        },
        {
          label: 'RJ號大到小',
          order: 'id',
          sort: 'desc'
        },
        {
          label: 'RJ號小到大',
          order: 'id',
          sort: 'asc'
        },
        {
          label: '價格貴到便宜',
          order: 'price',
          sort: 'desc'
        },
        {
          label: '價格便宜到貴',
          order: 'price',
          sort: 'asc'
        },
        {
          label: '評價高到低',
          order: 'rate_average_2dp',
          sort: 'desc'
        },
        {
          label: '評論多到少',
          order: 'review_count',
          sort: 'desc'
        },
        {
          label: '售出數多到少',
          order: 'dl_count',
          sort: 'desc'
        },
        {
          label: '我的評價排序',
          order: 'rating',
          sort: 'desc'
        },
        {
          label: '全年齡新作優先',
          order: 'nsfw',
          sort: 'asc'
        },
        {
          label: '隨機排序',
          order: 'random',
          sort: 'desc'
        }
      ]
    }
  },

  created () {
    this.refreshPageTitle();
    this.seed = Math.floor(Math.random() * 100);
  },

  mounted() {
    if (localStorage.sortOption) {
      try {
        this.sortOption = JSON.parse(localStorage.sortOption);
      } catch {
        localStorage.removeItem('sortOption');
      }
    }
    if (localStorage.subtitleOnly) {
      this.subtitleOnly = (localStorage.subtitleOnly === 'true');
    }
    if (localStorage.displayMode) {
      this.displayMode = localStorage.displayMode;
    }
    EventBus.$on("setProgress", (id, newProgress) => {
      for (let i in this.works){
        if(id === this.works[i].id){
          this.works[i].userProgress = newProgress;
          break;
        }
      }
    })
  },

  beforeDestroy() {
    EventBus.$off("setProgress")
  },

  computed: {
    url () {
      const query = this.$route.query
      if (query.circleId) {
        return `/api/circles/${this.$route.query.circleId}/works`
      } else if (query.tagId) {
        return `/api/tags/${this.$route.query.tagId}/works`
      } else if (query.vaId) {
        return `/api/vas/${this.$route.query.vaId}/works`
      } else if (query.keyword) {
        return `/api/search/${query.keyword}`
      } else if (query.seriesId) {
        return `/api/series/${this.$route.query.seriesId}/works`
      } else {
        return '/api/works'
      }
    }
  },

  // keep-alive hooks
  // <keep-alive /> is set in MainLayout
  activated () {
    // this.reset()
  },

  deactivated () {
    // this.stopLoad = true
  },

  watch: {
    url () {
      this.reset()
    },

    sortOption (newSortOptionSetting) {
      localStorage.sortOption = JSON.stringify(newSortOptionSetting);
      this.seed = Math.floor(Math.random() * 100);
      this.reset();
    },

    subtitleOnly (newSubtitleOnly) {
      localStorage.subtitleOnly = newSubtitleOnly;
    },

    showLabel (newLabelSetting) {
      localStorage.showLabel = newLabelSetting;
    },

    listMode (newListModeSetting) {
      localStorage.listMode = newListModeSetting;
    },

    detailMode(newModeSetting) {
      localStorage.detailMode = newModeSetting;
    },
  },

  methods: {
    onLoad (index, done) {
      this.requestWorksQueue()
        .then(() => done())
    },

    requestWorksQueue () {
      const params = {
        order: this.sortOption.order,
        sort: this.sortOption.sort,
        page: this.pagination.currentPage + 1 || 1,
        seed: this.seed,
        subtitle: this.subtitleOnly ? 1 : 0
      }

      return this.$axios.get(this.url, { params })
        .then((response) => {
          const works = response.data.works
          this.works = (params.page === 1) ? works.concat() : this.works.concat(works)
          this.pagination = response.data.pagination

          if (this.works.length >= this.pagination.totalCount) {
            this.stopLoad = true
          }
        })
        .catch((error) => {
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            if (error.response.status !== 401) {
              this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
            }
          } else {
            this.showErrNotif(error.message || error)
          }
          this.stopLoad = true
        })
    },

    refreshPageTitle () {
      if (this.$route.query.circleId || this.$route.query.tagId || this.$route.query.vaId || this.$route.query.seriesId) {
        let url = '', restrict = ''
        if (this.$route.query.circleId) {
          restrict = 'circles'
          url = `/api/${restrict}/${this.$route.query.circleId}`
        } else if (this.$route.query.tagId) {
          restrict = 'tags'
          url = `/api/${restrict}/${this.$route.query.tagId}`
        } else if (this.$route.query.vaId){
          restrict = 'vas'
          url = `/api/${restrict}/${this.$route.query.vaId}`
        } else {
          restrict = 'series'
          url = `/api/${restrict}/${this.$route.query.seriesId}`
        }

        this.$axios.get(url)
          .then((response) => {
            const name = response.data.name
            let pageTitle

            switch (restrict) {
              case 'tags':
                pageTitle = 'Works tagged with '
                break
              case 'vas':
                pageTitle = 'Works voiced by '
                break
              case 'circles':
                pageTitle = 'Works by '
                break
              case 'series':
                pageTitle = 'Works in '
                break
            }
            pageTitle += name || ''

            this.pageTitle = pageTitle
          })
          .catch((error) => {
            if (error.response) {
              // 请求已发出，但服务器响应的状态码不在 2xx 范围内
              if (error.response.status !== 401) {
                this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
              }
            } else {
              this.showErrNotif(error.message || error)
            }
          })
      } else if (this.$route.query.keyword) {
        this.pageTitle = `Search by ${this.$route.query.keyword}`
      } else {
        this.pageTitle = 'All works'
      }
    },

    reset () {
      this.stopLoad = true
      this.refreshPageTitle()
      this.pagination = { currentPage:0, pageSize:12, totalCount:0 }
      this.requestWorksQueue()
        .then(() => {
          this.stopLoad = false
        })
    },

    subtitleFilter () {
        if (this.subtitleOnly) {
            window.location.href = '/works?tagId=-1'
        }
        else{
            window.location.href = '/works'
        }
    },
  }
}
</script>

<style lang="scss">
.list {
  // 宽度 >= $breakpoint-sm-min
  @media (min-width: $breakpoint-sm-min) {
    padding: 0px 20px;
  }
}
.work-card {
  // 宽度 > $breakpoint-xl-min
  @media (min-width: $breakpoint-md-min) {
    width: 560px;
  }
}
.dark .ant-pagination-item-link,
.dark .ant-pagination-options-quick-jumper {
  color: #fff !important;
  background-color: transparent !important;
  border: none !important;
}
.dark .ant-pagination-item {
  //border: none !important;
  background-color: transparent !important;
}
.dark .ant-pagination-item a {
  color: #fff !important;
}
.dark .ant-pagination-item-ellipsis {
  color: #fff !important;
}
.dark .ant-pagination-options-quick-jumper input {
  background-color: transparent !important;
  color: white;
}
.ant-pagination-item ,
.ant-pagination-jump-next,
.ant-pagination-jump-prev,
.ant-pagination-next,
.ant-pagination-prev {
  @media (max-width: $breakpoint-xs-max) {
    // compact mode
    margin-top: 4px;
    margin-right: 4px;
    margin-bottom: 4px;
    //height: 28px;
    //line-height: 28px;
    //min-width: 28px;
    //border: none !important;
  }
}
body {
  // side effect of antd
  color: black !important;
}
body.body--dark {
  // side effect of antd
  color: #fff !important;
}
.ant-pagination-options {
  @media (max-width: 576px) {
    display: block !important;
    text-align: center !important;
    margin-top: 2px !important;
  }
}
</style>
