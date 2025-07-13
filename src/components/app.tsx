import React, { FunctionComponent, useEffect } from 'react';
import styled from 'styled-components';
import { ZakekeEnvironment, ZakekeViewer, ZakekeProvider } from 'zakeke-configurator-react';
import Selector from './selector';

const Layout = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-gap: 40px;
    height: 100%;
    padding: 40px;
`


const zakekeEnvironment = new ZakekeEnvironment();


const App: FunctionComponent<{}> = () => {

    // useEffect(() => {
    //     function handleAddToCartRequest(compositionId: string, previewUrl: string, quantity: number) {
    //         // Replace with your own logic to POST this info to your backend
    //         console.log("compositionId:", compositionId);
    //         console.log("previewUrl:", previewUrl);
    //         console.log("quantity:", quantity);


    //     }

    //     function messageListener(event: MessageEvent) {
    //         console.log("Message Received", event, MessageEvent)
    //         if (event.data?.zakekeMessageType === "AddToCart") {
    //             const { composition, preview, quantity } = event.data.message;
    //             handleAddToCartRequest(composition, preview, quantity);
    //         }
    //     }

    //     window.addEventListener("message", messageListener);

    //     // Cleanup
    //     return () => {
    //         window.removeEventListener("message", messageListener);
    //     };
    // }, []);

    useEffect(() => {
        function handleMessage(event: MessageEvent) {
            console.log("event", event)
            console.log("event.data", event.data)
            if (event.data?.zakekeMessageType === "AddToCart") {
                const { composition, preview, quantity } = event.data.message;

                // Trigger Shopify add
                // fetch("/cart/add.js", {
                //     method: "POST",
                //     headers: {
                //     "Content-Type": "application/json",
                //     },
                //     body: JSON.stringify({
                //     id: YOUR_SHOPIFY_VARIANT_ID,
                //     quantity,
                //     properties: {
                //         "Zakeke Composition ID": composition,
                //         "Preview Image": preview
                //     }
                //     })
                // });
            }
        }

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
        }, []);

    return (
        <ZakekeProvider environment={zakekeEnvironment}>
            <Layout>
                <Selector />
                <div><ZakekeViewer /></div>
            </Layout>
        </ZakekeProvider>
    );
}

export default App;















// import React, { FunctionComponent, useEffect } from 'react';
// import styled from 'styled-components';
// import { ZakekeEnvironment, ZakekeViewer, ZakekeProvider } from 'zakeke-configurator-react';
// import Selector from './selector';


// const Layout = styled.div`
//     display: grid;
//     grid-template-columns: 1fr 1fr;
//     grid-gap: 40px;
//     height: 100%;
//     padding: 40px;
// `

// const zakekeEnvironment = new ZakekeEnvironment();

// const App: FunctionComponent<{}> = () => {
//     return <ZakekeProvider environment={zakekeEnvironment}>
//         <Layout>
//             <Selector />
//             <div><ZakekeViewer /></div>
//         </Layout>
//     </ZakekeProvider>;

// }

// export default App; 


