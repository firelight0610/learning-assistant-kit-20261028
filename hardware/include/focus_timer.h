#ifndef FOCUS_TIMER_H
#define FOCUS_TIMER_H

#include <stdbool.h>
#include <stdint.h>

typedef enum { FOCUS_IDLE, FOCUS_RUNNING, FOCUS_PAUSED, FOCUS_DONE } FocusState;

typedef struct {
    FocusState state;
    uint32_t duration_ms;
    uint32_t remaining_ms;
    uint32_t updated_at_ms;
    bool raw_pressed;
    bool stable_pressed;
    bool long_press_fired;
    uint32_t raw_changed_at_ms;
    uint32_t pressed_at_ms;
} FocusTimer;

/* now_ms is a monotonic uint32 millisecond counter, e.g. HAL_GetTick(). */
void focus_timer_init(FocusTimer *timer, uint32_t duration_seconds, uint32_t now_ms);
void focus_timer_tick(FocusTimer *timer, uint32_t now_ms);
void focus_timer_toggle(FocusTimer *timer, uint32_t now_ms);
void focus_timer_reset(FocusTimer *timer, uint32_t now_ms);
/* Poll at least every 5-10 ms. true means the physical button is pressed. */
void focus_timer_poll(FocusTimer *timer, uint32_t now_ms, bool button_pressed);
uint32_t focus_timer_remaining_seconds(const FocusTimer *timer);
const char *focus_timer_state_text(const FocusTimer *timer);

#endif
