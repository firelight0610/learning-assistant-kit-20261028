#include "focus_timer.h"

#define DEBOUNCE_MS 30u
#define LONG_PRESS_MS 800u

void focus_timer_init(FocusTimer *timer, uint32_t duration_seconds, uint32_t now_ms) {
    /* Limit to one day so rounding milliseconds to seconds cannot overflow. */
    if (duration_seconds == 0u || duration_seconds > 86400u) duration_seconds = 1500u;
    *timer = (FocusTimer){0};
    timer->duration_ms = duration_seconds * 1000u;
    timer->remaining_ms = timer->duration_ms;
    timer->updated_at_ms = now_ms;
    timer->raw_changed_at_ms = now_ms;
    timer->state = FOCUS_IDLE;
}

void focus_timer_tick(FocusTimer *timer, uint32_t now_ms) {
    uint32_t elapsed_ms = now_ms - timer->updated_at_ms;
    timer->updated_at_ms = now_ms;
    if (timer->state != FOCUS_RUNNING) return;
    if (elapsed_ms >= timer->remaining_ms) {
        timer->remaining_ms = 0u;
        timer->state = FOCUS_DONE;
    } else {
        timer->remaining_ms -= elapsed_ms;
    }
}

void focus_timer_toggle(FocusTimer *timer, uint32_t now_ms) {
    focus_timer_tick(timer, now_ms);
    if (timer->state == FOCUS_RUNNING) timer->state = FOCUS_PAUSED;
    else if (timer->state == FOCUS_IDLE || timer->state == FOCUS_PAUSED) timer->state = FOCUS_RUNNING;
}

void focus_timer_reset(FocusTimer *timer, uint32_t now_ms) {
    timer->state = FOCUS_IDLE;
    timer->remaining_ms = timer->duration_ms;
    timer->updated_at_ms = now_ms;
}

void focus_timer_poll(FocusTimer *timer, uint32_t now_ms, bool button_pressed) {
    focus_timer_tick(timer, now_ms);
    if (button_pressed != timer->raw_pressed) {
        timer->raw_pressed = button_pressed;
        timer->raw_changed_at_ms = now_ms;
    }
    if (timer->raw_pressed != timer->stable_pressed && now_ms - timer->raw_changed_at_ms >= DEBOUNCE_MS) {
        timer->stable_pressed = timer->raw_pressed;
        if (timer->stable_pressed) {
            timer->pressed_at_ms = now_ms;
            timer->long_press_fired = false;
        } else if (!timer->long_press_fired) {
            focus_timer_toggle(timer, now_ms);
        }
    }
    if (timer->stable_pressed && !timer->long_press_fired && now_ms - timer->pressed_at_ms >= LONG_PRESS_MS) {
        focus_timer_reset(timer, now_ms);
        timer->long_press_fired = true;
    }
}

uint32_t focus_timer_remaining_seconds(const FocusTimer *timer) {
    return (timer->remaining_ms + 999u) / 1000u;
}

const char *focus_timer_state_text(const FocusTimer *timer) {
    switch (timer->state) {
        case FOCUS_IDLE: return "READY";
        case FOCUS_RUNNING: return "FOCUS";
        case FOCUS_PAUSED: return "PAUSE";
        case FOCUS_DONE: return "DONE";
    }
    return "READY";
}
