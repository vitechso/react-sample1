

import React from 'react';
import Scrollbars from 'react-custom-scrollbars';
import '../../styles/simpleScrollbars.css';


export default React.forwardRef((props, ref) => {

    /*
        Helper compoenent for rendering simple, pre-styled, scrollbars.
    */


    return <Scrollbars
        renderTrackVertical={props => <div className="scrollbar-track-v" {...props} />}
        renderTrackHorizontal={props => <div className="scrollbar-track-h" {...props} />}
        renderThumbVertical={props => <div className="scrollbar-thumb-v" {...props} />}
        renderThumbHorizontal={props => <div className="scrollbar-thumb-h" {...props} />}
        {...props}
        ref = {ref}
    >

        {props.children}

    </Scrollbars>

})