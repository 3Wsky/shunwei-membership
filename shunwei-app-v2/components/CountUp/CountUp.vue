<template>
    <text class="count-up">{{ display }}</text>
</template>

<script>
export default {
    name: 'CountUp',
    props: {
        value: { type: [Number, String], default: 0 },
        duration: { type: Number, default: 700 },
        decimals: { type: Number, default: 0 }
    },
    data() {
        return { display: this.format(0), _current: 0, _timer: null };
    },
    watch: {
        value(v) {
            this.animateTo(this.toNum(v));
        }
    },
    mounted() {
        this.animateTo(this.toNum(this.value));
    },
    beforeDestroy() {
        if (this._timer) clearInterval(this._timer);
    },
    methods: {
        toNum(v) {
            const n = Number(v);
            return Number.isFinite(n) ? n : 0;
        },
        format(n) {
            return Number(n).toFixed(this.decimals);
        },
        animateTo(target) {
            if (this._timer) clearInterval(this._timer);
            const from = this._current;
            const diff = target - from;
            if (diff === 0) {
                this.display = this.format(target);
                return;
            }
            const start = Date.now();
            const duration = Math.max(120, this.duration);
            this._timer = setInterval(() => {
                const t = Math.min(1, (Date.now() - start) / duration);
                const eased = 1 - Math.pow(1 - t, 3);
                this._current = from + diff * eased;
                this.display = this.format(this._current);
                if (t >= 1) {
                    this._current = target;
                    this.display = this.format(target);
                    clearInterval(this._timer);
                    this._timer = null;
                }
            }, 16);
        }
    }
};
</script>

<style scoped>
.count-up {
    font-variant-numeric: tabular-nums;
}
</style>
