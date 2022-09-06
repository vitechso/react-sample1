
import React from 'react'
import { useLocation } from 'react-router-dom';

// Helper function to get URL search params using react hooks.
const useURLQuery =  () =>  {
    const { search } = useLocation();
    return React.useMemo(() => new URLSearchParams(search), [search]);
}

export default useURLQuery;