/*
 * Integration reference, not a standalone flashable project.
 * Add focus_timer.c and this logic to the WORKING vendor example first.
 * Implement the four board functions with the example's verified GPIO/OLED API.
 * No pins, OLED controller or active levels are assumed here.
 */
#include "main.h"
#include "focus_timer.h"
#include <stdio.h>

/* These board-specific declarations must be mapped to your actual example. */
bool board_button_pressed(void);
void board_led_write(bool on);
void board_display_lines(const char *line1, const char *line2);
void board_uart_write_line(const char *line);

static FocusTimer focus_timer;
static uint32_t last_display_ms;

void study_focus_init(bool demo_mode) {
    focus_timer_init(&focus_timer, demo_mode ? 10u : 1500u, HAL_GetTick());
    last_display_ms = HAL_GetTick() - 100u;
}

/* Call from the main while loop every 5-10ms. No delay-based countdown. */
void study_focus_loop(void) {
    uint32_t now_ms = HAL_GetTick();
    focus_timer_poll(&focus_timer, now_ms, board_button_pressed());
    bool led_on = focus_timer.state == FOCUS_RUNNING;
    if (focus_timer.state == FOCUS_DONE) led_on = (now_ms / 250u) % 2u != 0u;
    board_led_write(led_on);
    if (now_ms - last_display_ms >= 100u) {
        last_display_ms = now_ms;
        uint32_t seconds = focus_timer_remaining_seconds(&focus_timer);
        char time_text[16];
        char log_text[48];
        snprintf(time_text, sizeof(time_text), "%02lu:%02lu", (unsigned long)(seconds / 60u), (unsigned long)(seconds % 60u));
        board_display_lines(focus_timer_state_text(&focus_timer), time_text);
        /* Log once per second, or on state change, for a photo-friendly UART log. */
        static uint32_t previous_seconds = UINT32_MAX;
        static FocusState previous_state = FOCUS_IDLE;
        if (seconds != previous_seconds || focus_timer.state != previous_state) {
            snprintf(log_text, sizeof(log_text), "%s %s", focus_timer_state_text(&focus_timer), time_text);
            board_uart_write_line(log_text);
            previous_seconds = seconds;
            previous_state = focus_timer.state;
        }
    }
}
