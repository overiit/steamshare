<script lang="ts">
    export let primary = false;
    export let grey = false;
    export let full = false;
    export let disabled = false;
    export let small = false;
    export let no3d = false;
    export let onClick = () => {};
</script>

<button on:click={onClick} disabled={disabled} class="{ primary ? "primary" : "" } {grey ? "grey" : ""} {full ? "full" : ""} {disabled ? "disabled" : ""} {small ? "small" : ""} {no3d ? "no3d" : ""}">
    <slot></slot>
</button>

<style lang="scss">
    button {
        border: none;
        padding: 0;
        margin: 0;
        border-radius: .3rem;
        padding: .5rem 1rem;
        background-color: #9f9f9f;
        border-bottom: 5px solid rgba(0, 0, 0, .4);
        color: white;
        font-weight: 700;
        cursor: pointer;
        &.full {
            width: 100%;
        }
        &.small {
            padding: .25rem .5rem;
        }
        
        &:not(.disabled), &:not(:disabled) {
            &:hover {
                margin-top: 1px;
                border-bottom-width: 4px;
            }
            &:active {
                margin-top: 5px;
                border-bottom-width: 0px;
            }
        }

        &:disabled, &.disabled {
            cursor: not-allowed;
            opacity: .3;
        }

        &.primary {
            background-color: #3FAAD8;
        }
        &.grey {
            background-color: #595B5F;
        }
    }
</style>