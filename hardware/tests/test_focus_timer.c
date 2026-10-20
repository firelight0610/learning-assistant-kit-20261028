#include "focus_timer.h"
#include <assert.h>
#include <stdio.h>
#include <string.h>

static void short_press(FocusTimer *timer, uint32_t now) {
    focus_timer_poll(timer, now, true);
    focus_timer_poll(timer, now + 31u, true);
    focus_timer_poll(timer, now + 100u, false);
    focus_timer_poll(timer, now + 131u, false);
}

int main(void) {
    FocusTimer timer;
    focus_timer_init(&timer, 10u, 0u);
    assert(timer.state == FOCUS_IDLE && focus_timer_remaining_seconds(&timer) == 10u);
    focus_timer_tick(&timer, 5000u);
    assert(focus_timer_remaining_seconds(&timer) == 10u);
    focus_timer_toggle(&timer, 5000u);
    focus_timer_tick(&timer, 6501u);
    assert(focus_timer_remaining_seconds(&timer) == 9u);
    focus_timer_toggle(&timer, 7000u);
    assert(timer.state == FOCUS_PAUSED && timer.remaining_ms == 8000u);
    focus_timer_tick(&timer, 20000u);
    assert(timer.remaining_ms == 8000u);
    focus_timer_toggle(&timer, 20000u);
    focus_timer_tick(&timer, 28000u);
    assert(timer.state == FOCUS_DONE && timer.remaining_ms == 0u);
    focus_timer_toggle(&timer, 29000u);
    assert(timer.state == FOCUS_DONE);
    focus_timer_reset(&timer, 30000u);
    assert(timer.state == FOCUS_IDLE && timer.remaining_ms == 10000u);

    focus_timer_init(&timer, 10u, UINT32_MAX - 500u);
    focus_timer_toggle(&timer, UINT32_MAX - 500u);
    focus_timer_tick(&timer, 499u);
    assert(timer.remaining_ms == 9000u); /* 32-bit uptime rollover */

    focus_timer_init(&timer, 10u, 0u);
    focus_timer_poll(&timer, 1u, true);
    focus_timer_poll(&timer, 10u, false);
    focus_timer_poll(&timer, 50u, false);
    assert(timer.state == FOCUS_IDLE); /* bounce must not start */
    short_press(&timer, 100u);
    assert(timer.state == FOCUS_RUNNING);
    short_press(&timer, 500u);
    assert(timer.state == FOCUS_PAUSED);
    focus_timer_poll(&timer, 1000u, true);
    focus_timer_poll(&timer, 1031u, true);
    focus_timer_poll(&timer, 1832u, true);
    assert(timer.state == FOCUS_IDLE && timer.remaining_ms == 10000u);
    focus_timer_poll(&timer, 1900u, false);
    focus_timer_poll(&timer, 1931u, false);
    assert(timer.state == FOCUS_IDLE); /* long release must not restart */

    focus_timer_init(&timer, 1500u, 0u);
    focus_timer_toggle(&timer, 0u);
    for (uint32_t now = 0u; now <= 1500000u; now += 10u) focus_timer_tick(&timer, now);
    assert(timer.state == FOCUS_DONE && !strcmp(focus_timer_state_text(&timer), "DONE"));
    puts("PASS: start, pause/resume, reset, expiry, bounce, long press, uptime wrap, simulated 25-minute run");
    return 0;
}
