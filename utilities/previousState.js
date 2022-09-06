
import React from 'react'

// Helper function to cache previous props
const usePrevState = (value) => {
    const ref = React.useRef();
    React.useEffect(() => {
        ref.current = value;
    });
    return ref.current;
}

export default usePrevState;