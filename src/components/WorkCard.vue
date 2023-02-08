<template>
  <q-card>
    <router-link :to="`/work/${metadata.id}`">
      <CoverSFW :workid="metadata.id" :nsfw="false" :release="metadata.release" :userProgress="metadata.userProgress" />
    </router-link>

    <q-separator />

    <div v-if="!thumbnailMode">
      <!-- 标题 -->
      <div class="q-mx-sm text-h6 text-weight-regular ellipsis-2-lines">
        <router-link :to="`/work/${metadata.id}`" style="color: inherit">
          {{ metadata.title }}
        </router-link>
      </div>

      <!-- 社团/系列 -->
      <div class="q-ml-sm q-mt-sm q-mb-xs text-subtitle1 text-weight-regular ellipsis">
        <router-link :to="`/works?circleId=${metadata.circle.id}`" class="text-grey">
          {{ metadata.circle.name }}
        </router-link>
        <span v-if="metadata.series.id && metadata.series.id !== 0" class="text-grey">/</span>
        <router-link :to="`/works?seriesId=${metadata.series.id}`" class="text-grey">
          {{ metadata.series.name }}
        </router-link>
      </div>


      <!-- 评价&评论 -->
      <div v-show="metadata.title" class="row items-center">
        <!-- 评价 -->
        <div class="col-auto q-ml-sm">
          <q-rating
            v-model="rating"
            size="sm"
            :color="userMarked ? 'blue' : 'amber'"
            icon="star_border"
            icon-selected="star"
            icon-half="star_half"
          />

          <!-- 评价分布明细 -->
          <q-tooltip content-class="text-subtitle1" v-if=metadata.rate_count_detail>
            <div>平均: {{ metadata.rate_average_2dp }}</div>
            <div v-for="(rate, index) in sortedRatings" :key=index class="row items-center">
              <div class="col">{{ rate.review_point }}星</div>

              <!-- 评价占比 -->
              <q-linear-progress
                :value="rate.ratio/100"
                color="amber"
                track-color="white"
                style="height: 15px; width: 100px"
                class="col-auto"
              />

              <div class="col q-mx-sm">({{ rate.count }})</div>
            </div>
          </q-tooltip>
        </div>

        <div class="col-auto">
          <span class="text-weight-medium text-body1 text-red">{{ metadata.rate_average_2dp }}</span>
          <span class="text-grey"> ({{ metadata.rate_count }})</span>
        </div>

        <!-- 评论数量 -->
        <div class="col-auto q-px-sm">
          <q-icon name="chat" size="xs" />
          <span class="text-grey"> ({{ metadata.review_count }})</span>
        </div>

        <!-- DLsite链接 -->
        <div class="col-auto">
          <div v-if="metadata.id >= 1000000">
            <q-icon name="launch" size="xs" /><a class="text-blue" :href="`https://www.dlsite.com/home/work/=/product_id/RJ${String(metadata.id).padStart(8,'0')}.html`" rel="noreferrer noopener" target="_blank">DLsite</a>
          </div>
          <div v-else>
            <q-icon name="launch" size="xs" /><a class="text-blue" :href="`https://www.dlsite.com/home/work/=/product_id/RJ${String(metadata.id).padStart(6,'0')}.html`" rel="noreferrer noopener" target="_blank">DLsite</a>
          </div>
        </div>
      </div>

      <!-- 价格&售出数 -->
      <div v-show="metadata.title">
        <span class="q-mx-sm text-weight-medium text-h6 text-red">{{ metadata.price }} 日元</span>
        <span>售出数: {{ metadata.dl_count }}</span>
        <span v-if="!metadata.nsfw" class="q-mx-sm" style="background: #ffb6c1; color: #56842a">🏷️全年龄</span>
        <div v-for="(tag, index) in metadata.tags" :key=index>
          <span v-if="tag.name === '中文字幕'" class="q-mx-sm" style="background: #7fff00; color: #56842a">🏷️中文字幕</span>
          <span v-if="tag.name === '中文影片'" class="q-mx-sm" style="background: #00ffff; color: #56842a">🏷️中文影片</span>
        </div>
      </div>

      <!-- 标签 -->
      <div class="q-ma-xs" v-if="showTags">
        <router-link
          v-for="(tag, index) in metadata.tags"
          :to="`/works?tagId=${tag.id}`"
          :key=index
        >
          <q-chip size="md" class="shadow-2" :class="$q.dark.isActive ? 'bg-grey-9' : ''">
            {{ tag.name }}
          </q-chip>
        </router-link>
      </div>

      <!-- 声优 -->
      <div class="q-mx-xs q-my-sm">
        <router-link
          v-for="(va, index) in metadata.vas"
          :to="`/works?vaId=${va.id}`"
          :key=index
        >
          <q-chip square size="md" class="shadow-2" color="teal" text-color="white">
            {{ va.name }}
          </q-chip>
        </router-link>
      </div>
    </div>
  </q-card>
</template>

<script>
// import WorkDetails from 'components/WorkDetails'
import CoverSFW from 'components/CoverSFW'
import NotifyMixin from '../mixins/Notification.js'
import DarkMode from '../mixins/DarkMode'

export default {
  name: 'WorkCard',

  mixins: [NotifyMixin,DarkMode],

  components: {
    CoverSFW
  },

  props: {
    metadata: {
      type: Object,
      required: true
    },
    thumbnailMode: {
      type: Boolean,
      default: false
    }
  },

  data () {
    return {
      rating: 0,
      userMarked: false,
      showTags: true
    }
  },

  computed: {
    sortedRatings: function() {
      function compare(a, b) {
        return (a.review_point > b.review_point) ? -1 : 1;
      }

      return this.metadata.rate_count_detail.slice().sort(compare);
    }
  },

  // TODO: Refactor with Vuex?
  mounted() {
    if (this.metadata.userRating) {
      this.userMarked = true;
      this.rating = this.metadata.userRating;
    } else {
      this.userMarked = false;
      this.rating = this.metadata.rate_average_2dp || 0;
    }

    // 极个别作品没有标签
    if (this.metadata.tags && this.metadata.tags[0].name === null) {
      this.showTags = false;
    }
  },

  watch: {
    rating (newRating, oldRating) {
      if (oldRating) {
        const submitPayload = {
          'user_name': this.$store.state.User.name, // 用户名不会被后端使用
          'work_id': this.metadata.id,
          'rating': newRating
        };
        this.userMarked = true;
        this.submitRating(submitPayload);
      }
    }
  },

  methods: {
    submitRating (payload) {
      this.$axios.put('/api/review', payload)
        .then((response) => {
          this.showSuccNotif(response.data.message)
        })
        .catch((error) => {
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    },
  }
}
</script>
